import { z } from "zod/v4";
import { protectedProcedure, router } from "@/server/trpc/init";
import { generateLLM } from "@/lib/llm/client";
import { stripJsonFences } from "@/lib/utils/parseLLMResponse";
import {
  buildRecommendationPrompt,
  parseRecommendationResponse,
  formatButtonLabel,
  type AiRecommendation,
} from "@/lib/llm/prompts/dashboard-recommendations";

export const dashboardRouter = router({
  getReports: protectedProcedure
    .input(z.object({ scenarioId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      // Fetch all dashboard_reports
      let query = ctx.supabase
        .from("dashboard_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (input.scenarioId) {
        query = query.eq("scenario_id", input.scenarioId);
      }

      const { data, error } = await query;
      if (error) return { autoApproved: [], flagged: [] };

      const autoApproved = (data || []).filter(r => r.status === "auto_approved");

      // Deduplicate flagged items: keep latest row per scenario_id (data is ordered by created_at DESC)
      const flaggedRaw = (data || []).filter(r => r.status === "flagged");
      const seenKeys = new Set<string>();
      const flagged = flaggedRaw.filter(r => {
        const key = `${r.scenario_id || ''}::${r.traveler_name || ''}`;
        if (seenKeys.has(key)) return false;
        seenKeys.add(key);
        return true;
      });

      return { autoApproved, flagged };
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    // Get counts from dashboard_reports
    const { data: reports } = await ctx.supabase
      .from("dashboard_reports")
      .select("status, avg_confidence");

    const total = reports?.length || 0;
    const autoApproved = reports?.filter(r => r.status === "auto_approved").length || 0;
    const flagged = reports?.filter(r => r.status === "flagged").length || 0;
    const avgConfidence = reports?.length
      ? Math.round(reports.reduce((sum, r) => sum + (r.avg_confidence || 0), 0) / reports.length)
      : 0;

    return {
      total,
      autoApproved,
      flagged,
      autoApprovedRate: total > 0 ? Math.round((autoApproved / total) * 100) : 0,
      flaggedRate: total > 0 ? Math.round((flagged / total) * 100) : 0,
      avgConfidence,
    };
  }),

  getAiRecommendations: protectedProcedure
    .input(z.object({ itemIds: z.array(z.number()) }))
    .mutation(async ({ input, ctx }): Promise<Record<string, AiRecommendation>> => {
      try {
        // Step 1 (code): re-fetch items from DB by IDs — never trust client payloads
        const { data: items } = await ctx.supabase
          .from("dashboard_reports")
          .select("*")
          .in("id", input.itemIds)
          .eq("status", "flagged");

        if (!items?.length) return {};

        // Step 2 (code): build structured prompt from DB items
        const { system, user } = buildRecommendationPrompt(items);

        // Step 3 (LLM): single Haiku call, 10s timeout
        // generateLLM has built-in 1-retry — acceptable here (worst case ~23s)
        const response = await generateLLM(
          [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          { maxTokens: 3000, timeout: 20000 }
        );

        // Step 4 (code): strip JSON fences + Zod validate
        const cleaned = stripJsonFences(response.content);
        const parsed = parseRecommendationResponse(cleaned);

        // Step 5 (code): format labels deterministically, pass through enriched data
        return Object.fromEntries(
          parsed.map((r) => [
            String(r.id),
            {
              action: r.action,
              label: formatButtonLabel(
                r.action,
                items.find((i) => i.id === r.id)?.flag_reason || ""
              ),
              rationale: r.rationale,
              sourceFindings: r.source_findings,
              importance: r.importance,
            },
          ])
        );
      } catch (err) {
        const errMsg = err instanceof Error ? `${err.message}` : String(err);
        console.error("[AI Recommendations] Failed, using deterministic fallback:", errMsg);
        return {};
      }
    }),
});
