import { z } from 'zod/v4';

export const ExpenseItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  vendor: z.string(),
  date: z.string(),
  amount: z.number(),
  currency: z.string(),
  category: z.string(),
  original_category: z.string().nullable(),
  confidence: z.number().min(0).max(100),
  sources: z.array(z.string()),
  reasoning: z.string(),
  policy_status: z.enum([
    'within_policy',
    'within_policy_after_recategorization',
    'exceeds_policy',
    'pending_review',
  ]),
  flag_reason: z.string().nullable(),
  recommendation: z.enum([
    'auto_approve',
    'approve_with_review',
    'flag_for_review',
    'request_employee_input',
  ]),
});

export const MissingItemSchema = z.object({
  id: z.string(),
  detected_gap: z.string(),
  estimated_amount: z.number(),
  currency: z.string(),
  evidence: z.string(),
  confidence: z.number(),
  action_needed: z.string(),
});

export const AssemblyOutputSchema = z.object({
  report: z.object({
    id: z.string(),
    traveler: z.string(),
    trip_summary: z.string(),
    total_amount: z.number(),
    currency: z.string(),
    cost_center: z.string(),
    approver: z.string(),
    items: z.array(ExpenseItemSchema),
    flagged_items: z.array(ExpenseItemSchema),
    missing_items: z.array(MissingItemSchema),
    summary: z.object({
      total_items: z.number(),
      auto_approve_count: z.number(),
      review_count: z.number(),
      missing_count: z.number(),
      total_amount: z.number(),
      overall_confidence: z.number(),
    }),
  }),
});

export type AssemblyOutput = z.infer<typeof AssemblyOutputSchema>;
export type ExpenseItem = z.infer<typeof ExpenseItemSchema>;
export type MissingItem = z.infer<typeof MissingItemSchema>;
