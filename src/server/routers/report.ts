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
        const raw = fallback.response;
        if (raw.report) {
          assemblyOutput = AssemblyOutputSchema.parse(raw);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const items = (raw.items || []).map((item: any, i: number) => {
            const isRecategorized = item.status === "re-categorized" && item.re_categorization;
            const isGap = item.status === "gap_detected";
            const policyCheck = item.policy_check || {};
            const recat = item.re_categorization || {};
            const gap = item.gap_detection || {};

            // Build reasoning string from available data
            let reasoning = "";
            if (isRecategorized) {
              reasoning = recat.reason || "";
              if (recat.evidence?.length) {
                reasoning += " Evidence: " + recat.evidence.join(". ") + ".";
              }
            } else if (isGap) {
              reasoning = gap.reason || `Gap detected: ${item.description}`;
            } else if (policyCheck.applicable_rule) {
              reasoning = `${policyCheck.applicable_rule}. Amount ₹${item.amount} is ${policyCheck.within_limit ? "within" : "over"} the ₹${policyCheck.limit} limit.`;
            }

            return {
              id: item.id || `EXP-${String(i + 1).padStart(3, "0")}`,
              description: (item.description || "").replace(/ — .*$/, ""),
              vendor: (item.description || "").replace(/ — .*$/, ""),
              date: item.date || "",
              amount: item.amount || 0,
              currency: item.currency || "INR",
              category: item.category || "Miscellaneous",
              original_category: isRecategorized ? (recat.from || null) : null,
              confidence: item.confidence || 0,
              sources: item.sources || [],
              reasoning,
              policy_status: isRecategorized ? "within_policy_after_recategorization"
                : isGap ? "pending_review"
                : policyCheck.within_limit ? "within_policy"
                : "exceeds_policy",
              flag_reason: isRecategorized
                ? `Re-categorized from ${recat.from} to ${recat.to}. ${policyCheck.applicable_rule || ""}`
                : isGap ? "Gap detected — needs employee confirmation"
                : null,
              recommendation: isRecategorized ? "approve_with_review"
                : isGap ? "request_employee_input"
                : item.status === "compliant" ? "auto_approve"
                : "flag_for_review",
            };
          });

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const flaggedItems = items.filter((item: any) =>
            item.recommendation === "approve_with_review" || item.recommendation === "flag_for_review"
          );

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const missingItems = (raw.items || [])
            .filter((item: any) => item.status === "gap_detected")
            .map((item: any) => {
              const gap = item.gap_detection || {};
              return {
                id: item.id || "EXP-GAP",
                detected_gap: gap.reason || `Transport from ${gap.from_location || "?"} to ${gap.to_location || "?"}`,
                estimated_amount: item.amount || 0,
                currency: item.currency || "INR",
                evidence: `${gap.from_location || ""} → ${gap.to_location || ""}, ~${gap.estimated_distance_km || "?"}km. ${gap.reason || ""}`,
                confidence: item.confidence || 67,
                action_needed: gap.needs_confirmation ? "Confirm amount and provide receipt if available" : "Review",
              };
            });

          const summary = raw.summary || {};
          assemblyOutput = {
            report: {
              id: raw.trip_id || `RPT-${Date.now()}`,
              traveler: raw.traveler?.name || "Unknown",
              trip_summary: `${raw.trip?.destination || ""}, ${raw.trip?.dates || ""} — ${raw.trip?.purpose || ""}`,
              total_amount: summary.total_amount || 0,
              currency: summary.currency || "INR",
              cost_center: raw.traveler?.cost_center || "",
              approver: raw.traveler?.approver || "",
              items,
              flagged_items: flaggedItems,
              missing_items: missingItems,
              summary: {
                total_items: items.length,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                auto_approve_count: items.filter((i: any) => i.recommendation === "auto_approve").length,
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
