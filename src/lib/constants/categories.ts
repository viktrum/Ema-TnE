export const EXPENSE_CATEGORIES = [
  'Airlines/Flights',
  'Flights',
  'Hotels/Accommodation',
  'Accommodation',
  'Ground Transport',
  'Local Transport',
  'Airport Transfer',
  'Client Entertainment',
  'Meals',
  'Conference/Events',
  'Office Supplies',
  'Miscellaneous',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
