import type { RawScenario, RawPolicy, RawTransaction, AssembledItem, AssembledReport } from "./types";
import { generateLLM, isLLMAvailable } from "@/lib/llm/client";
import { buildItemCategorizePrompt } from "@/lib/llm/prompts/categorize-item";

/**
 * Hybrid assembly engine.
 *
 * Phase 1 (deterministic, instant): fetch, match context, lookup policy
 * Phase 2 (AI, parallel ~2s): categorize each item + generate reasoning
 * Phase 3 (deterministic, instant): compile report, recommendations, gaps
 */
export async function assembleReport(
  scenario: RawScenario,
  policy: RawPolicy,
): Promise<AssembledReport> {
  const rawItems: RawTransaction[] = (scenario.items || scenario.transactions || []) as RawTransaction[];
  const context = scenario.context || {};
  const traveler = scenario.traveler || { name: "Unknown", cost_center: "", approver: "", employee_id: "" };
  const trip = scenario.trip || {
    destination: scenario.destination || "",
    dates: `${scenario.start_date || ""} to ${scenario.end_date || ""}`,
    purpose: scenario.purpose || "",
    type: scenario.trip_type || "domestic",
  };
  const tripType = (trip.type || scenario.trip_type || "domestic") as "domestic" | "international";
  const isDomestic = tripType === "domestic";
  const policyRules = isDomestic ? policy.domestic : policy.international;

  // Phase 1: Deterministic — match context per item
  const matchedItems = rawItems.map((txn) => ({
    txn,
    matchedContext: matchContext(txn, context, policyRules),
  }));

  // Phase 2: AI categorization — parallel calls
  const useAI = isLLMAvailable() && process.env.FALLBACK_MODE !== "true";
  let aiResults: Array<{ category: string; confidence: number; reasoning: string } | null>;

  if (useAI) {
    // Run all 7 items in parallel
    aiResults = await Promise.all(
      matchedItems.map(async ({ txn, matchedContext }) => {
        try {
          const messages = buildItemCategorizePrompt(
            {
              description: (txn.description || "").replace(/ — .*$/, ""),
              amount: txn.amount || 0,
              currency: txn.currency || "INR",
              date: txn.date || "",
              payment_method: txn.payment_method || "corporate_card",
              has_receipt: txn.has_receipt ?? true,
              merchant_category: txn.original_category,
            },
            matchedContext,
            tripType,
          );
          const response = await generateLLM(messages, { timeout: 10000, maxTokens: 256 });
          const parsed = JSON.parse(extractJSON(response.content));
          return {
            category: parsed.category || txn.category,
            confidence: typeof parsed.confidence === "number" ? parsed.confidence : txn.confidence,
            reasoning: parsed.reasoning || "",
          };
        } catch {
          // AI failed for this item — use fallback
          return null;
        }
      }),
    );
  } else {
    aiResults = rawItems.map(() => null);
  }

  // Phase 3: Deterministic — compile report
  const items: AssembledItem[] = rawItems.map((txn, i) => {
    const ai = aiResults[i];
    const isGap = txn.status === "gap_detected";
    const recat = txn.re_categorization;
    const gap = txn.gap_detection;
    const policyCheck = txn.policy_check || { limit: 0, within_limit: true, applicable_rule: "" };

    // Use AI result if available, else fall back to seed data
    const category = ai?.category || txn.category || "Miscellaneous";
    const confidence = ai?.confidence || txn.confidence || 80;
    const reasoning = ai?.reasoning || buildFallbackReasoning(txn, policyCheck, recat, gap);

    // Determine if this was re-categorized (AI changed the merchant category)
    const originalCategory = recat?.from ||
      (ai && ai.category !== txn.original_category && txn.original_category !== txn.category ? txn.original_category : null) ||
      (txn.status === "re-categorized" ? (recat?.from || null) : null);

    const isRecategorized = originalCategory !== null;

    const policyStatus = isRecategorized ? "within_policy_after_recategorization"
      : isGap ? "pending_review"
      : policyCheck.within_limit ? "within_policy"
      : "exceeds_policy";

    const recommendation = isRecategorized ? "approve_with_review"
      : isGap ? "request_employee_input"
      : confidence >= 95 && policyCheck.within_limit ? "auto_approve"
      : txn.status === "compliant" ? "auto_approve"
      : "flag_for_review";

    const description = (txn.description || "").replace(/ — .*$/, "");

    return {
      id: txn.id || `EXP-${String(i + 1).padStart(3, "0")}`,
      description,
      vendor: description,
      date: txn.date || "",
      amount: txn.amount || 0,
      currency: txn.currency || "INR",
      category,
      original_category: isRecategorized ? originalCategory : null,
      confidence,
      sources: txn.sources || ["policy"],
      reasoning,
      policy_status: policyStatus,
      flag_reason: isRecategorized
        ? `Re-categorized from ${originalCategory} to ${category}. ${policyCheck.applicable_rule}`
        : isGap ? "Gap detected — needs employee confirmation"
        : null,
      recommendation,
    };
  });

  const flaggedItems = items.filter(
    (item) => item.recommendation === "approve_with_review" || item.recommendation === "flag_for_review",
  );

  const missingItems = rawItems
    .filter((txn) => txn.status === "gap_detected")
    .map((txn) => {
      const gap = txn.gap_detection;
      return {
        id: txn.id || "EXP-GAP",
        detected_gap: gap?.reason || `Transport gap: ${txn.description}`,
        estimated_amount: txn.amount || 0,
        currency: txn.currency || "INR",
        evidence: gap
          ? `${gap.from_location} → ${gap.to_location}, ~${gap.estimated_distance_km}km`
          : "Gap detected between trip legs",
        confidence: txn.confidence || 67,
        action_needed: gap?.needs_confirmation
          ? "Confirm amount and provide receipt if available"
          : "Review",
      };
    });

  const totalAmount = scenario.summary?.total_amount ||
    items.reduce((sum, item) => sum + item.amount, 0);
  const autoApproveCount = items.filter((i) => i.recommendation === "auto_approve").length;
  const avgConfidence = items.length > 0
    ? Math.round(items.reduce((sum, i) => sum + i.confidence, 0) / items.length)
    : 0;

  return {
    id: scenario.trip_id || `RPT-${Date.now()}`,
    traveler: traveler.name || "Unknown",
    trip_summary: `${trip.destination}, ${trip.dates} — ${trip.purpose}`,
    total_amount: totalAmount,
    currency: scenario.summary?.currency || "INR",
    cost_center: traveler.cost_center || "",
    approver: traveler.approver || "",
    items,
    flagged_items: flaggedItems,
    missing_items: missingItems,
    summary: {
      total_items: items.length,
      auto_approve_count: autoApproveCount,
      review_count: flaggedItems.length,
      missing_count: missingItems.length,
      total_amount: totalAmount,
      overall_confidence: avgConfidence,
    },
  };
}

// --- Helpers ---

function matchContext(
  txn: RawTransaction,
  context: RawScenario["context"],
  policyRules: RawPolicy["domestic"],
) {
  const matched: {
    calendar?: Array<{ title: string; time?: string; attendees?: string[]; location?: string }>;
    crm?: Array<{ account_name: string; deal_value?: number; stage?: string; contact_name?: string; contact_title?: string }>;
    email?: Array<{ subject: string; type?: string }>;
    policy_limits?: Array<{ category: string; limit: number; rule: string }>;
  } = {};

  // Match calendar events on same date
  if (context?.calendar) {
    const dayEvents = context.calendar.filter((evt) => evt.date === txn.date);
    if (dayEvents.length > 0) {
      matched.calendar = dayEvents.map((evt) => ({
        title: evt.title,
        time: evt.time,
        attendees: evt.attendees,
        location: evt.location,
      }));
    }
  }

  // Match CRM records (if calendar has external attendees)
  if (context?.crm && context.crm.length > 0) {
    const hasExternalAttendee = context.calendar?.some(
      (evt) => evt.date === txn.date && evt.attendees?.some((a) => !a.includes("nexgen")),
    );
    if (hasExternalAttendee) {
      matched.crm = context.crm.map((c) => ({
        account_name: c.account_name,
        deal_value: c.deal_value,
        stage: c.stage,
        contact_name: c.contact_name,
        contact_title: c.contact_title,
      }));
    }
  }

  // Match email confirmations
  if (context?.email) {
    const desc = (txn.description || "").toLowerCase();
    const matchedEmails = context.email.filter(
      (e) => e.subject?.toLowerCase().includes(desc.split(" ")[0] || "___"),
    );
    if (matchedEmails.length > 0) {
      matched.email = matchedEmails.map((e) => ({ subject: e.subject, type: e.type }));
    }
  }

  // Policy limits for likely categories
  if (policyRules?.meals) {
    const limits: Array<{ category: string; limit: number; rule: string }> = [];
    if (policyRules.meals.standard_per_day)
      limits.push({ category: "Personal Meal", limit: policyRules.meals.standard_per_day, rule: "Standard meal per day" });
    if (policyRules.meals.client_entertainment_per_event)
      limits.push({ category: "Client Entertainment", limit: policyRules.meals.client_entertainment_per_event, rule: "Client entertainment per event" });
    if (policyRules.transport?.no_receipt_threshold)
      limits.push({ category: "No-receipt threshold", limit: policyRules.transport.no_receipt_threshold, rule: "No receipt required below this" });
    matched.policy_limits = limits;
  }

  return matched;
}

function buildFallbackReasoning(
  txn: RawTransaction,
  policyCheck: NonNullable<RawTransaction["policy_check"]>,
  recat: RawTransaction["re_categorization"],
  gap: RawTransaction["gap_detection"],
): string {
  if (txn.status === "re-categorized" && recat) {
    let text = recat.reason || `Re-categorized from ${recat.from} to ${recat.to}.`;
    if (recat.evidence?.length) text += " Evidence: " + recat.evidence.join(". ") + ".";
    return text;
  }
  if (txn.status === "gap_detected" && gap) {
    return gap.reason || `Transport gap: ${gap.from_location} → ${gap.to_location}.`;
  }
  if (policyCheck.applicable_rule) {
    return `${policyCheck.applicable_rule}. ₹${txn.amount?.toLocaleString("en-IN")} is ${policyCheck.within_limit ? "within" : "over"} the ₹${policyCheck.limit?.toLocaleString("en-IN")} limit.`;
  }
  return `${txn.category || "Expense"} of ₹${txn.amount?.toLocaleString("en-IN")}.`;
}

function extractJSON(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) return match[1].trim();
  const jsonMatch = text.match(/(\{[\s\S]*\})/);
  if (jsonMatch) return jsonMatch[1];
  return text;
}
