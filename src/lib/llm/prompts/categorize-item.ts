import type { LLMMessage } from "@/lib/llm/types";

/**
 * Small per-item prompt for AI categorization + reasoning.
 * ~200 tokens input, ~100 tokens output. Runs in parallel for all items.
 */
export function buildItemCategorizePrompt(item: {
  description: string;
  amount: number;
  currency: string;
  date: string;
  payment_method: string;
  has_receipt: boolean;
  merchant_category?: string;
}, matchedContext: {
  calendar?: Array<{ title: string; time?: string; attendees?: string[]; location?: string }>;
  crm?: Array<{ account_name: string; deal_value?: number; stage?: string; contact_name?: string; contact_title?: string }>;
  email?: Array<{ subject: string; type?: string }>;
  policy_limits?: { category: string; limit: number; rule: string }[];
}, tripType: "domestic" | "international"): LLMMessage[] {
  const contextParts: string[] = [];

  if (matchedContext.calendar?.length) {
    contextParts.push("Calendar: " + matchedContext.calendar.map(
      (c) => `"${c.title}" at ${c.time || "unknown time"}${c.attendees?.length ? `, attendees: ${c.attendees.join(", ")}` : ""}${c.location ? `, location: ${c.location}` : ""}`
    ).join("; "));
  }

  if (matchedContext.crm?.length) {
    contextParts.push("CRM: " + matchedContext.crm.map(
      (c) => `${c.account_name}${c.deal_value ? ` (₹${(c.deal_value / 10000000).toFixed(1)}Cr deal, ${c.stage})` : ""}${c.contact_name ? `, Contact: ${c.contact_name}${c.contact_title ? ` (${c.contact_title})` : ""}` : ""}`
    ).join("; "));
  }

  if (matchedContext.email?.length) {
    contextParts.push("Email: " + matchedContext.email.map((e) => e.subject).join("; "));
  }

  if (matchedContext.policy_limits?.length) {
    contextParts.push("Policy: " + matchedContext.policy_limits.map(
      (p) => `${p.category}: ₹${p.limit.toLocaleString("en-IN")} (${p.rule})`
    ).join("; "));
  }

  const receiptNote = !item.has_receipt ? " No receipt." : "";
  const contextStr = contextParts.length > 0 ? contextParts.join("\n") : "No additional context.";

  return [
    {
      role: "system",
      content: `You are a T&E expense categorization engine. Given a transaction and its matched enterprise context, return a JSON object with category, confidence (0-100), and reasoning (2-3 short sentences citing specific evidence). Be precise — name specific systems, people, amounts. Trip type: ${tripType}.

Categories: Domestic Flight, International Flight, Accommodation, Local Transport, Personal Meal, Client Entertainment, Meals & Beverages, Conference/Event, Office Supplies, Communication, Miscellaneous.

Return ONLY valid JSON: {"category":"...","confidence":N,"reasoning":"..."}`,
    },
    {
      role: "user",
      content: `${item.description}, ₹${item.amount.toLocaleString("en-IN")}, ${item.date}, ${item.payment_method}.${receiptNote}

${contextStr}`,
    },
  ];
}
