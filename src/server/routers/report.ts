import { z } from "zod/v4";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "@/server/trpc/init";
import { isLLMAvailable } from "@/lib/llm/client";
import { generateStructured } from "@/lib/llm/structured-output";
import { buildAssemblyMessages } from "@/lib/llm/prompts/assembly";
import { AssemblyOutputSchema } from "@/server/schemas/assembly";

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

      let assemblyOutput;

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

        assemblyOutput = AssemblyOutputSchema.parse(fallback.response);
      } else {
        // Live LLM call
        const messages = buildAssemblyMessages(scenario.data, policy.data);
        assemblyOutput = await generateStructured(
          messages,
          AssemblyOutputSchema
        );
      }

      const latencyMs = Date.now() - startTime;

      // Save report
      const { data: report, error: reportError } = await ctx.supabase
        .from("reports")
        .upsert(
          {
            scenario_id: input.scenarioId,
            user_id: ctx.user.id,
            data: assemblyOutput,
            status: "draft",
            fallback_used: useFallback,
            created_at: new Date().toISOString(),
          },
          { onConflict: "scenario_id,user_id" }
        )
        .select()
        .single();

      if (reportError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save report",
        });
      }

      // Log to audit_log
      await ctx.supabase.from("audit_log").insert({
        user_id: ctx.user.id,
        action: "report_assembled",
        entity_type: "report",
        entity_id: report.id,
        metadata: {
          scenario_id: input.scenarioId,
          fallback_used: useFallback,
          latency_ms: latencyMs,
        },
      });

      // Log to ai_metrics
      await ctx.supabase.from("ai_metrics").insert({
        user_id: ctx.user.id,
        operation: "assembly",
        scenario_id: input.scenarioId,
        latency_ms: latencyMs,
        fallback_used: useFallback,
        model: useFallback ? null : "claude-sonnet-4-20250514",
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
        .single();

      if (error) return null;
      return data;
    }),

  submit: protectedProcedure
    .input(z.object({ reportId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("reports")
        .update({ status: "submitted", submitted_at: new Date().toISOString() })
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
        user_id: ctx.user.id,
        action: "report_submitted",
        entity_type: "report",
        entity_id: input.reportId,
      });

      return data;
    }),
});
