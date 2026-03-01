import { z } from "zod/v4";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "@/server/trpc/init";
import { assembleReport } from "@/lib/engine/assembler";
import type { RawScenario, RawPolicy } from "@/lib/engine/types";

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

      // Check if scenario has embedded items (seed data) or needs fallback fetch
      let scenarioData: RawScenario = scenario as unknown as RawScenario;

      if (!scenarioData.items || (scenarioData.items as unknown[]).length === 0) {
        // Scenario doesn't have embedded items — check fallbacks table
        const { data: fallback } = await ctx.supabase
          .from("fallbacks")
          .select("*")
          .eq("type", "assembly")
          .eq("scenario_id", input.scenarioId)
          .single();

        if (fallback?.response) {
          // Merge fallback data into scenario for the engine
          scenarioData = { ...scenarioData, ...fallback.response };
        }
      }

      // HYBRID ASSEMBLY — deterministic matching + AI categorization (parallel)
      const report = await assembleReport(scenarioData, policy as unknown as RawPolicy);

      const latencyMs = Date.now() - startTime;

      // Save report to Supabase
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
        console.error("Report save error:", reportError);
        // Don't throw — the report was assembled, just save failed
      }

      // Log to audit_log
      await ctx.supabase.from("audit_log").insert({
        event_type: "assembly",
        user_id: ctx.user.id,
        report_id: reportId,
        scenario_id: input.scenarioId,
        details: {
          latency_ms: latencyMs,
          total_amount: report.total_amount,
          item_count: report.items.length,
          engine: "deterministic",
        },
      });

      // Log to ai_metrics
      await ctx.supabase.from("ai_metrics").insert({
        prompt_type: "assembly",
        model: "deterministic",
        latency_ms: latencyMs,
        tokens_in: 0,
        tokens_out: 0,
        confidence: report.summary.overall_confidence,
        fallback_used: false,
      });

      return { report, _fallback: false };
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

      // Bridge to dashboard_reports for realtime dashboard (Phase 3.5)
      const reportItems = (data.items as any[]) || [];
      const flaggedItems = (data.flagged_items as any[]) || [];
      const hasFlagged = flaggedItems.length > 0;

      const avgConfidence = reportItems.length > 0
        ? Math.round(reportItems.reduce((sum: number, item: any) => sum + (item.confidence || 0), 0) / reportItems.length)
        : 0;

      // Fetch scenario for destination + dates
      const { data: scenario } = await ctx.supabase
        .from("scenarios")
        .select("destination, start_date, end_date")
        .eq("id", data.scenario_id)
        .single();

      // Fetch user for role
      const { data: dbUser } = await ctx.supabase
        .from("users")
        .select("role, name")
        .eq("id", ctx.user.id)
        .single();

      const initials = data.traveler_name
        .split(' ')
        .map((p: string) => p[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

      const dates = scenario
        ? `${new Date(scenario.start_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}-${new Date(scenario.end_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}`
        : 'Today';

      // Determine flag details from the most severe flagged item
      let flagReason: string | null = null;
      let flagSeverity: string | null = null;
      if (hasFlagged) {
        const topFlag = flaggedItems[0] as any;
        flagReason = topFlag.flag_reason || topFlag.reasoning || `${topFlag.description || 'Item'} flagged for review`;
        flagSeverity = (topFlag.confidence ?? 80) < 70 ? 'HIGH' : (topFlag.confidence ?? 80) < 85 ? 'MEDIUM' : 'LOW';
      }

      await ctx.supabase.from("dashboard_reports").insert({
        scenario_id: data.scenario_id,
        traveler_name: data.traveler_name,
        traveler_role: dbUser?.role || 'Employee',
        traveler_initials: initials,
        destination: scenario?.destination || data.trip_summary?.split(',')[0] || 'N/A',
        dates,
        total_amount: data.total_amount,
        currency: data.currency || 'INR',
        item_count: reportItems.length,
        avg_confidence: avgConfidence,
        status: hasFlagged ? 'flagged' : 'auto_approved',
        flag_reason: flagReason,
        flag_severity: flagSeverity,
        items: data.items,
        reasoning: data.summary || {},
        sources: [...new Set(reportItems.flatMap((item: any) => item.sources || []))],
      });

      // Audit log + return (parallelized for speed)
      await ctx.supabase.from("audit_log").insert({
        event_type: "submit",
        user_id: ctx.user.id,
        report_id: input.reportId,
        details: { dashboard_bridge: true },
      });

      return data;
    }),
});
