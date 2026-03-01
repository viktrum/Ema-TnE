import { z } from "zod/v4";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "@/server/trpc/init";
import { isLLMAvailable } from "@/lib/llm/client";
import { generateStructured } from "@/lib/llm/structured-output";
import { buildAssemblyMessages } from "@/lib/llm/prompts/assembly";
import { AssemblyOutputSchema } from "@/server/schemas/assembly";
import type { AssemblyOutput } from "@/server/schemas/assembly";

export const reportRouter = router({
  assemble: protectedProcedure
    .input(z.object({ scenarioId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const startTime = Date.now();

      // Fetch scenario
      const { data: scenario, error: scenarioError } = await ctx.supabase
        .from("scenarios")
        .select("*")
        .eq("id", input.scenarioId)
        .single();

      if (scenarioError || !scenario) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Scenario not found",
        });
      }

      // Fetch policy
      const { data: policy, error: policyError } = await ctx.supabase
        .from("policies")
        .select("*")
        .limit(1)
        .single();

      if (policyError || !policy) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Policy not found",
        });
      }

      // Check fallback mode
      const useFallback =
        process.env.FALLBACK_MODE === "true" || !isLLMAvailable();

      let assemblyOutput: AssemblyOutput;

      if (useFallback) {
        // Fetch from fallbacks table
        const { data: fallback } = await ctx.supabase
          .from("fallbacks")
          .select("*")
          .eq("type", "assembly")
          .eq("scenario_id", input.scenarioId)
          .single();

        if (!fallback?.response) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "No fallback data available for this scenario",
          });
        }

        // Transform fallback data to match AssemblyOutputSchema
        // Fallback seed data has a different shape than the schema
        const raw = fallback.response;
        if (raw.report) {
          // Already wrapped — try parsing directly
          assemblyOutput = AssemblyOutputSchema.parse(raw);
        } else {
          // Transform flat fallback structure to schema format
          const items = (raw.items || []).map((item: Record<string, unknown>, i: number) => ({
            id: item.id || `EXP-${String(i + 1).padStart(3, "0")}`,
            description: item.description || "",
            vendor: item.vendor || item.description || "",
            date: item.date || "",
            amount: item.amount || 0,
            currency: item.currency || "INR",
            category: item.category || "Miscellaneous",
            original_category: item.original_category || null,
            confidence: item.confidence || 0,
            sources: item.sources || [],
            reasoning: item.reasoning || item.policy_check?.toString() || "",
            policy_status: item.status === "compliant" ? "within_policy"
              : item.original_category ? "within_policy_after_recategorization"
              : "pending_review",
            flag_reason: item.flag_reason || null,
            recommendation: item.status === "compliant" ? "auto_approve"
              : item.original_category ? "approve_with_review"
              : item.status === "gap_detected" ? "request_employee_input"
              : "flag_for_review",
          }));

          const flaggedItems = items.filter(
            (item: Record<string, unknown>) =>
              item.recommendation !== "auto_approve" && item.recommendation !== "request_employee_input"
          );
          const missingItems = (raw.items || [])
            .filter((item: Record<string, unknown>) => item.status === "gap_detected")
            .map((item: Record<string, unknown>) => ({
              id: item.id || "EXP-GAP",
              detected_gap: item.gap_detection?.toString() || item.description || "Transport gap detected",
              estimated_amount: item.amount || 0,
              currency: item.currency || "INR",
              evidence: item.gap_detection?.toString() || "Gap detected between trip legs",
              confidence: item.confidence || 67,
              action_needed: "Confirm amount and provide details",
            }));

          const summary = raw.summary || {};
          assemblyOutput = {
            report: {
              id: `RPT-${Date.now()}`,
              traveler: raw.traveler?.name || "Unknown",
              trip_summary: `${raw.trip?.destination || ""}, ${raw.trip?.dates || ""} — ${raw.trip?.purpose || ""}`,
              total_amount: summary.total_amount || items.reduce((s: number, i: Record<string, unknown>) => s + (Number(i.amount) || 0), 0),
              currency: summary.currency || "INR",
              cost_center: raw.traveler?.cost_center || "",
              approver: raw.traveler?.approver || "",
              items,
              flagged_items: flaggedItems,
              missing_items: missingItems,
              summary: {
                total_items: items.length,
                auto_approve_count: items.filter((i: Record<string, unknown>) => i.recommendation === "auto_approve").length,
                review_count: flaggedItems.length,
                missing_count: missingItems.length,
                total_amount: summary.total_amount || 0,
                overall_confidence: summary.avg_confidence || 90,
              },
            },
          };
        }
      } else {
        // Pass scenario and policy directly — prompt builder handles flexible shapes
        const messages = buildAssemblyMessages(scenario, policy);
        assemblyOutput = await generateStructured(
          messages,
          AssemblyOutputSchema,
          { timeout: 8000, maxTokens: 4096 },
        );
      }

      const latencyMs = Date.now() - startTime;
      const report = assemblyOutput.report;

      // Save report to reports table with correct column names
      const reportId = report.id || `RPT-${Date.now()}`;
      const { error: reportError } = await ctx.supabase
        .from("reports")
        .upsert(
          {
            id: reportId,
            scenario_id: input.scenarioId,
            user_id: ctx.user.id,
            traveler_name: report.traveler,
            trip_summary: report.trip_summary,
            total_amount: report.total_amount,
            currency: report.currency,
            cost_center: report.cost_center,
            approver_name: report.approver,
            items: report.items,
            flagged_items: report.flagged_items,
            missing_items: report.missing_items,
            summary: report.summary,
            status: "draft",
          },
          { onConflict: "id" },
        )
        .select()
        .single();

      if (reportError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save report",
        });
      }

      // Log to audit_log (correct column names: event_type, details)
      await ctx.supabase.from("audit_log").insert({
        event_type: "assembly",
        user_id: ctx.user.id,
        report_id: reportId,
        scenario_id: input.scenarioId,
        details: {
          fallback_used: useFallback,
          latency_ms: latencyMs,
          total_amount: report.total_amount,
          item_count: report.items.length,
        },
      });

      // Log to ai_metrics (correct column names: prompt_type, model)
      await ctx.supabase.from("ai_metrics").insert({
        prompt_type: "assembly",
        model: useFallback ? "fallback" : "claude-sonnet-4-20250514",
        latency_ms: latencyMs,
        tokens_in: 0,
        tokens_out: 0,
        confidence: report.summary.overall_confidence,
        fallback_used: useFallback,
      });

      return assemblyOutput;
    }),

  getByScenario: protectedProcedure
    .input(z.object({ scenarioId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("reports")
        .select("*")
        .eq("scenario_id", input.scenarioId)
        .eq("user_id", ctx.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) return null;
      return data;
    }),

  submit: protectedProcedure
    .input(z.object({ reportId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("reports")
        .update({
          status: "submitted",
          submitted_at: new Date().toISOString(),
        })
        .eq("id", input.reportId)
        .eq("user_id", ctx.user.id)
        .select()
        .single();

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to submit report",
        });
      }

      // Log to audit_log
      await ctx.supabase.from("audit_log").insert({
        event_type: "submit",
        user_id: ctx.user.id,
        report_id: input.reportId,
        details: {},
      });

      return data;
    }),
});
