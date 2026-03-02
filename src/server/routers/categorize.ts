import { z } from 'zod/v4';
import { protectedProcedure, router } from '@/server/trpc/init';
import { generateLLM, isLLMAvailable } from '@/lib/llm/client';
import { buildCategorizeMessages } from '@/lib/llm/prompts/categorize';
import { stripJsonFences } from '@/lib/utils/parseLLMResponse';

export const categorizeRouter = router({
  reCategorize: protectedProcedure
    .input(
      z.object({
        itemId: z.string(),
        itemDescription: z.string(),
        itemAmount: z.number(),
        currentCategory: z.string(),
        newCategory: z.string(),
        scenarioId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // If LLM unavailable, accept user's choice
      if (!isLLMAvailable()) {
        return {
          accepted: true,
          category: input.newCategory,
          confidence: 80,
          reasoning: `User changed category to ${input.newCategory}`,
          policy_status: 'pending_review' as const,
          ai_suggestion: null,
        };
      }

      // Fetch scenario context
      const { data: scenario } = await ctx.supabase
        .from('scenarios')
        .select('context, trip_type, destination')
        .eq('id', input.scenarioId)
        .single();

      const tripContext = {
        destination: scenario?.destination || '',
        trip_type: scenario?.trip_type || 'domestic',
      };

      // Ask LLM what it thinks the category should be
      const messages = buildCategorizeMessages(
        {
          description: input.itemDescription,
          amount: input.itemAmount,
          category: input.newCategory,
        },
        tripContext,
        scenario?.context || {}
      );

      try {
        const response = await generateLLM(messages, {
          timeout: 8000,
          maxTokens: 256,
        });

        const cleaned = stripJsonFences(response.content);
        const parsed = JSON.parse(cleaned);

        const aiCategory = String(parsed.category || input.newCategory);
        const agrees =
          aiCategory.toLowerCase() === input.newCategory.toLowerCase();

        // Validate policy_status against known values
        const validPolicyStatuses = ['within_policy', 'within_policy_after_recategorization', 'exceeds_policy', 'near_limit', 'pending_review'];
        const policyStatus = validPolicyStatuses.includes(parsed.policy_status)
          ? parsed.policy_status
          : 'pending_review';

        return {
          accepted: agrees,
          category: input.newCategory,
          confidence: Number(parsed.confidence) || 80,
          reasoning: String(parsed.reasoning || ''),
          policy_status: policyStatus,
          ai_suggestion: agrees
            ? null
            : {
                category: aiCategory,
                reasoning: parsed.reasoning || '',
                confidence: parsed.confidence || 80,
              },
        };
      } catch {
        // LLM failed — accept user's choice
        return {
          accepted: true,
          category: input.newCategory,
          confidence: 75,
          reasoning: `User re-categorized to ${input.newCategory}`,
          policy_status: 'pending_review' as const,
          ai_suggestion: null,
        };
      }
    }),
});
