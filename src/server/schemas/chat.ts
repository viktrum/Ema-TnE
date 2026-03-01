import { z } from 'zod/v4';

export const ChatActionSchema = z.object({
  type: z.enum([
    'update_category',
    'update_amount',
    'remove_item',
    'add_item',
    'update_confidence',
    'submit_report',
  ]),
  item_id: z.string().optional(),
  old_value: z.union([z.string(), z.number()]).optional(),
  new_value: z.union([z.string(), z.number()]).optional(),
  reasoning: z.string().optional(),
});

export const ChatOutputSchema = z.object({
  response: z.string(),
  actions: z.array(ChatActionSchema),
  report_updated: z.boolean(),
  show_submit_button: z.boolean(),
  needs_categorization: z.boolean(),
  new_item_for_categorization: z
    .object({
      description: z.string(),
      amount: z.number(),
      currency: z.string(),
      vendor: z.string(),
    })
    .optional(),
});

export type ChatOutput = z.infer<typeof ChatOutputSchema>;
export type ChatAction = z.infer<typeof ChatActionSchema>;
