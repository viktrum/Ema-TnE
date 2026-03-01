import type { LLMMessage } from '@/lib/llm/types';

const CATEGORIZE_SYSTEM_PROMPT = `You are the T&E categorization engine for NexGen Industries. Given a single transaction and trip context, assign the correct expense category, confidence score, and policy status.

CATEGORIES (pick exactly one):
- Domestic Flight, International Flight, Accommodation, Local Transport, Personal Meal, Client Entertainment, Meals & Beverages, Conference/Event, Office Supplies, Communication, Miscellaneous

RULES:
1. Use trip context to determine domestic vs international.
2. Check calendar/CRM context — if meal coincides with client meeting and CRM confirms active deal, categorize as Client Entertainment, not Personal Meal.
3. Confidence reflects how certain you are of the categorization, not the legitimacy of the expense.
4. "receipt_required" is true if amount > ₹500 AND no receipt available. Exception: if amount < ₹1,500, receipt is optional.
5. Cite the specific policy rule in your reasoning.

Return valid JSON matching CategorizeOutput schema.`;

export function buildCategorizeMessages(
  transaction: unknown,
  tripContext: unknown,
  availableContext: unknown
): LLMMessage[] {
  const userPrompt = `TRANSACTION:
${JSON.stringify(transaction, null, 2)}

TRIP CONTEXT:
${JSON.stringify(tripContext, null, 2)}

AVAILABLE CONTEXT (calendar, CRM, email, HRMS):
${JSON.stringify(availableContext, null, 2)}

Categorize this transaction. Return valid JSON matching the CategorizeOutput schema.`;

  return [
    { role: 'system', content: CATEGORIZE_SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ];
}
