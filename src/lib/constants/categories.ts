/** Categories matching the LLM categorize prompt in src/lib/llm/prompts/categorize.ts */
export const EXPENSE_CATEGORIES = [
  'Domestic Flight',
  'International Flight',
  'Accommodation',
  'Local Transport',
  'Airport Transfer',
  'Personal Meal',
  'Client Entertainment',
  'Meals & Beverages',
  'Conference/Event',
  'Office Supplies',
  'Communication',
  'Miscellaneous',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
