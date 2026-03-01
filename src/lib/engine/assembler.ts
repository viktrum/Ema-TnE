import type { RawScenario, RawPolicy, RawTransaction, AssembledItem, AssembledReport } from "./types";

/**
 * Deterministic assembly engine.
 * Takes raw scenario + policy data and produces a complete expense report
 * WITHOUT calling any LLM. Reasoning text is template-based.
 *
 * The LLM is only called AFTER this, to enrich reasoning for flagged items.
 */
export function assembleReport(
  scenario: RawScenario,
  policy: RawPolicy,
): AssembledReport {
  const rawItems: RawTransaction[] = (scenario.items || scenario.transactions || []) as RawTransaction[];
  const context = scenario.context || {};
  const traveler = scenario.traveler || { name: "Unknown", cost_center: "", approver: "", employee_id: "" };
  const trip = scenario.trip || {
    destination: scenario.destination || "",
    dates: `${scenario.start_date || ""} to ${scenario.end_date || ""}`,
    purpose: scenario.purpose || "",
    type: scenario.trip_type || "domestic",
  };
  const isDomestic = (trip.type || scenario.trip_type) === "domestic";
  const policyRules = isDomestic ? policy.domestic : policy.international;

  // Step 1-5: Process each transaction deterministically
  const items: AssembledItem[] = rawItems.map((txn, i) => {
    const isRecategorized = txn.status === "re-categorized" && !!txn.re_categorization;
    const isGap = txn.status === "gap_detected";
    const policyCheck = txn.policy_check || { limit: 0, within_limit: true, applicable_rule: "" };
    const recat = txn.re_categorization;
    const gap = txn.gap_detection;

    // Match context sources
    const matchedSources = matchSources(txn, context);

    // Build confidence score deterministically
    const confidence = scoreConfidence(txn, matchedSources, isRecategorized, isGap);

    // Build reasoning from templates
    const reasoning = buildReasoning(txn, matchedSources, policyCheck, recat, gap, isRecategorized, isGap);

    // Determine policy status
    const policyStatus = isRecategorized ? "within_policy_after_recategorization"
      : isGap ? "pending_review"
      : policyCheck.within_limit ? "within_policy"
      : "exceeds_policy";

    // Determine recommendation
    const recommendation = isRecategorized ? "approve_with_review"
      : isGap ? "request_employee_input"
      : txn.status === "compliant" && confidence >= 95 ? "auto_approve"
      : txn.status === "compliant" ? "auto_approve"
      : "flag_for_review";

    // Clean description (remove " — ..." suffix from seed data)
    const description = (txn.description || "").replace(/ — .*$/, "");

    return {
      id: txn.id || `EXP-${String(i + 1).padStart(3, "0")}`,
      description,
      vendor: description,
      date: txn.date || "",
      amount: txn.amount || 0,
      currency: txn.currency || "INR",
      category: txn.category || "Miscellaneous",
      original_category: isRecategorized ? (recat?.from || null) : null,
      confidence,
      sources: txn.sources || matchedSources,
      reasoning,
      policy_status: policyStatus,
      flag_reason: isRecategorized
        ? `Re-categorized from ${recat?.from} to ${recat?.to}. ${policyCheck.applicable_rule}`
        : isGap ? "Gap detected — needs employee confirmation"
        : null,
      recommendation,
    };
  });

  // Flagged items = approve_with_review or flag_for_review
  const flaggedItems = items.filter(
    (item) => item.recommendation === "approve_with_review" || item.recommendation === "flag_for_review"
  );

  // Missing items from gap detection
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

  // Summary
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

// --- Internal helpers ---

function matchSources(
  txn: RawTransaction,
  context: RawScenario["context"],
): string[] {
  const sources: string[] = [];

  // Card source
  if (txn.payment_method === "corporate_card") sources.push("corporate_card");

  // Calendar match — check if any calendar event is on the same date
  if (context?.calendar?.some((evt) => evt.date === txn.date)) {
    sources.push("calendar");
  }

  // CRM match — if calendar has client attendees and CRM has deals
  if (context?.crm && context.crm.length > 0 && context?.calendar?.some(
    (evt) => evt.date === txn.date && evt.attendees?.some((a) => !a.includes("nexgen"))
  )) {
    sources.push("crm");
  }

  // Email match — check for booking confirmations
  if (context?.email?.some((e) =>
    e.subject?.toLowerCase().includes(txn.description?.toLowerCase().split(" ")[0] || "___")
  )) {
    sources.push("email");
  }

  // Policy always applies
  sources.push("policy");

  return sources.length > 0 ? sources : txn.sources || ["policy"];
}

function scoreConfidence(
  txn: RawTransaction,
  sources: string[],
  isRecategorized: boolean,
  isGap: boolean,
): number {
  // Use seed confidence if available (it's already well-calibrated)
  if (txn.confidence && txn.confidence > 0) return txn.confidence;

  // Fallback formula
  let score = 60;
  score += sources.length * 10; // +10 per source
  if (!txn.has_receipt && txn.amount > 500) score -= 20;
  if (isRecategorized) score = Math.min(score, 94); // Cap re-categorized
  if (isGap) score = Math.min(score, 72); // Cap gaps
  return Math.min(score, 98);
}

function buildReasoning(
  txn: RawTransaction,
  sources: string[],
  policyCheck: NonNullable<RawTransaction["policy_check"]>,
  recat: RawTransaction["re_categorization"],
  gap: RawTransaction["gap_detection"],
  isRecategorized: boolean,
  isGap: boolean,
): string {
  if (isRecategorized && recat) {
    // Rich reasoning for the hero moment
    let text = recat.reason || `Re-categorized from ${recat.from} to ${recat.to}.`;
    if (recat.evidence?.length) {
      text += " Evidence: " + recat.evidence.join(". ") + ".";
    }
    if (policyCheck.applicable_rule) {
      text += ` Policy: ${policyCheck.applicable_rule}.`;
    }
    return text;
  }

  if (isGap && gap) {
    return gap.reason || `Transport gap detected: ${gap.from_location} → ${gap.to_location}, ~${gap.estimated_distance_km}km. No matching card transaction found.`;
  }

  // Standard item reasoning
  if (policyCheck.applicable_rule) {
    return `${policyCheck.applicable_rule}. Amount ₹${txn.amount?.toLocaleString("en-IN")} is ${policyCheck.within_limit ? "within" : "over"} the ₹${policyCheck.limit?.toLocaleString("en-IN")} limit.`;
  }

  return `${txn.category} expense of ₹${txn.amount?.toLocaleString("en-IN")}. ${sources.length} sources confirmed.`;
}
