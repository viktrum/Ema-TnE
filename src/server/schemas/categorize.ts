import { z } from 'zod/v4';

export const CategorizeOutputSchema = z.object({
  category: z.string(),
  confidence: z.number(),
  reasoning: z.string(),
  policy_status: z.enum([
    'within_policy',
    'exceeds_policy',
    'near_limit',
    'pending_review',
  ]),
  receipt_required: z.boolean(),
  sources: z.array(z.string()),
  recommendation: z.enum([
    'auto_approve',
    'approve_with_review',
    'flag_for_review',
  ]),
});

export type CategorizeOutput = z.infer<typeof CategorizeOutputSchema>;
