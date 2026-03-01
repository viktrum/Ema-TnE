import type { LLMMessage } from "@/lib/llm/types";

/**
 * Constrained per-item prompt for AI categorization + reasoning.
 * AI must pick from exact category list. Only re-categorize with strong evidence.
 * ~200 tokens input, ~100 tokens output. Runs in parallel for all items.
 */

// These are the ONLY valid expense categories
const EXPENSE_CATEGORIES = [
  "Flights",
  "Accommodation",
  "Airport Transfer",
  "Local Transport",
  "Personal Meal",
  "Client Entertainment",
  "Meals & Beverages",
  "Conference/Event",
  "Office Supplies",
  "Communication",
  "Miscellaneous",
] as const;

// Default mapping: merchant category → expense category
const MERCHANT_TO_EXPENSE: Record<string, string> = {
  Airlines: "Flights",
  Hotels: "Accommodation",
  Transportation: "Local Transport",
  Restaurants: "Personal Meal",
  "Food & Beverage": "Meals & Beverages",
};

export function getDefaultCategory(merchantCategory: string): string {
  return MERCHANT_TO_EXPENSE[merchantCategory] || "Miscellaneous";
}

export function buildItemCategorizePrompt(
  item: {
    description: string;
    amount: number;
    currency: string;
    date: string;
    payment_method: string;
    has_receipt: boolean;
    merchant_category?: string;
  },
  matchedContext: {
    calendar?: Array<{
      title: string;
      time?: string;
      attendees?: string[];
      location?: string;
    }>;
    crm?: Array<{
      account_name: string;
      deal_value?: number;
      stage?: string;
      contact_name?: string;
      contact_title?: string;
    }>;
    email?: Array<{ subject: string; type?: string }>;
    policy_limits?: { category: string; limit: number; rule: string }[];
  },
  tripType: "domestic" | "international",
): LLMMessage[] {
  const defaultCategory = item.merchant_category
    ? getDefaultCategory(item.merchant_category)
    : "Miscellaneous";

  const contextParts: string[] = [];

  if (matchedContext.calendar?.length) {
    contextParts.push(
      "Calendar: " +
        matchedContext.calendar
          .map(
            (c) =>
              `"${c.title}" at ${c.time || "unknown time"}${c.attendees?.length ? `, attendees: ${c.attendees.join(", ")}` : ""}${c.location ? `, location: ${c.location}` : ""}`,
          )
          .join("; "),
    );
  }

  if (matchedContext.crm?.length) {
    contextParts.push(
      "CRM: " +
        matchedContext.crm
          .map(
            (c) =>
              `${c.account_name}${c.deal_value ? ` (₹${(c.deal_value / 10000000).toFixed(1)}Cr deal, ${c.stage})` : ""}${c.contact_name ? `, Contact: ${c.contact_name}${c.contact_title ? ` (${c.contact_title})` : ""}` : ""}`,
          )
          .join("; "),
    );
  }

  if (matchedContext.email?.length) {
    contextParts.push(
      "Email: " + matchedContext.email.map((e) => e.subject).join("; "),
    );
  }

  if (matchedContext.policy_limits?.length) {
    contextParts.push(
      "Policy: " +
        matchedContext.policy_limits
          .map(
            (p) =>
              `${p.category}: ₹${p.limit.toLocaleString("en-IN")} (${p.rule})`,
          )
          .join("; "),
    );
  }

  const receiptNote = !item.has_receipt ? " No receipt available." : "";
  const contextStr =
    contextParts.length > 0
      ? contextParts.join("\n")
      : "No additional context matched.";

  return [
    {
      role: "system",
      content: `You are a T&E expense categorization engine for NexGen Industries.

TASK: Given a transaction with its merchant category and matched enterprise context, decide the correct EXPENSE category and write a brief reasoning.

VALID EXPENSE CATEGORIES (pick EXACTLY one):
${EXPENSE_CATEGORIES.map((c) => `- ${c}`).join("\n")}

DEFAULT RULE: The merchant category "${item.merchant_category || "Unknown"}" maps to "${defaultCategory}". USE THIS DEFAULT unless context strongly indicates otherwise.

WHEN TO RE-CATEGORIZE:
- ONLY re-categorize if Calendar shows a client meeting AND CRM confirms an active deal for the same contact. Both must be present.
- Example: Restaurant meal + Calendar client dinner + CRM active deal → change from "Personal Meal" to "Client Entertainment"
- Do NOT re-categorize flights, hotels, or transport — they stay as their default.

CONFIDENCE RULES:
- 95-98%: Multiple independent sources confirm (card + email + calendar)
- 90-94%: Strong evidence, re-categorization with good reason
- 70-89%: Partial evidence, some sources missing
- Below 70%: Missing receipt AND amount > ₹1,500, or conflicting data
- NEVER give 95%+ to a no-receipt cash transaction

Return ONLY valid JSON: {"category":"...","confidence":N,"reasoning":"2-3 sentences citing specific evidence"}`,
    },
    {
      role: "user",
      content: `Transaction: ${item.description}
Amount: ₹${item.amount.toLocaleString("en-IN")}
Date: ${item.date}
Payment: ${item.payment_method}
Merchant category: ${item.merchant_category || "Unknown"}
Default expense category: ${defaultCategory}${receiptNote}

Matched context:
${contextStr}`,
    },
  ];
}
