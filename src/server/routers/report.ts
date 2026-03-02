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

      const { data: scenario, error: scenarioError } = await ctx.supabase
        .from("scenarios")
        .select("*")
        .eq("id", input.scenarioId)
        .single();

      if (scenarioError || !scenario) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Scenario not found" });
      }

      const { data: policy, error: policyError } = await ctx.supabase
        .from("policies")
        .select("*")
        .limit(1)
        .single();

      if (policyError || !policy) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Policy not found" });
      }

      let scenarioData: RawScenario = scenario as unknown as RawScenario;

      if (!scenarioData.items || (scenarioData.items as unknown[]).length === 0) {
        const { data: fallback } = await ctx.supabase
          .from("fallbacks")
          .select("*")
          .eq("type", "assembly")
          .eq("scenario_id", input.scenarioId)
          .single();

        if (fallback?.response) {
          scenarioData = { ...scenarioData, ...fallback.response };
        }
      }

      const report = await assembleReport(scenarioData, policy as unknown as RawPolicy);
      const latencyMs = Date.now() - startTime;

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
      }

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

      const reportItems = (data.items as any[]) || [];
      const flaggedItems = (data.flagged_items as any[]) || [];
      const hasFlagged = flaggedItems.length > 0;

      const avgConfidence = reportItems.length > 0
        ? Math.round(reportItems.reduce((sum: number, item: any) => sum + (item.confidence || 0), 0) / reportItems.length)
        : 0;

      const { data: scenario } = await ctx.supabase
        .from("scenarios")
        .select("destination, start_date, end_date")
        .eq("id", data.scenario_id)
        .single();

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

      // Determine flag details — severity by flag TYPE, not confidence
      let flagReason: string | null = null;
      let flagSeverity: string | null = null;
      if (hasFlagged) {
        const topFlag = flaggedItems[0] as any;
        const desc = topFlag.description || 'Item';
        const amt = topFlag.amount ? `₹${Number(topFlag.amount).toLocaleString('en-IN')} ` : '';

        if (topFlag.original_category && topFlag.category) {
          flagReason = `Re-categorization: ${amt}${desc} re-categorized from ${topFlag.original_category} to ${topFlag.category}`;
        } else if (topFlag.flag_reason) {
          flagReason = topFlag.flag_reason;
        } else {
          flagReason = `${amt}${desc} flagged for review`;
        }

        flagSeverity = deriveFlagSeverity(topFlag);
      }

      // Build structured reasoning matching seeded format {summary, ai_reasoning}
      const summaryObj = data.summary as Record<string, unknown> | string | null;
      const reasoning: Record<string, string> = {};
      if (typeof summaryObj === 'string') {
        reasoning.summary = summaryObj;
      } else if (summaryObj) {
        reasoning.summary = String(summaryObj.summary || `${reportItems.length} items totaling ₹${data.total_amount?.toLocaleString('en-IN')}. ${flaggedItems.length} flagged for review.`);
        if (summaryObj.ai_reasoning) reasoning.ai_reasoning = String(summaryObj.ai_reasoning);
      }
      if (!reasoning.summary) {
        reasoning.summary = `${reportItems.length} expense items totaling ₹${data.total_amount?.toLocaleString('en-IN')}. Average confidence ${avgConfidence}%.`;
      }
      if (hasFlagged && !reasoning.ai_reasoning) {
        const topFlag = flaggedItems[0] as any;
        reasoning.ai_reasoning = typeof topFlag.reasoning === 'string' ? topFlag.reasoning : '';
      }

      const rawSources = [...new Set(reportItems.flatMap((item: any) => item.sources || []))];
      const cleanSources = rawSources.map(cleanSourceLabel);

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
        reasoning,
        sources: cleanSources,
      });

      await ctx.supabase.from("audit_log").insert({
        event_type: "submit",
        user_id: ctx.user.id,
        report_id: input.reportId,
        details: { dashboard_bridge: true },
      });

      return data;
    }),
});

function deriveFlagSeverity(flag: any): string {
  const reason = ((flag.flag_reason || '') + ' ' + (flag.reasoning || '')).toLowerCase();
  const policyStatus = (flag.policy_status || '').toLowerCase();

  if (policyStatus === 'exceeds_policy') return 'HIGH';
  if (reason.includes('missing receipt') && (flag.amount || 0) > 5000) return 'HIGH';
  if (reason.includes('unauthorized') || reason.includes('not eligible')) return 'HIGH';
  if (reason.includes('policy violation')) return 'HIGH';

  if (flag.original_category) return 'MEDIUM';
  if (reason.includes('duplicate')) return 'MEDIUM';
  if (reason.includes('pre-approval') || reason.includes('preapproval')) return 'MEDIUM';
  if (reason.includes('pattern') || reason.includes('anomaly')) return 'MEDIUM';
  if (policyStatus === 'pending_review') return 'MEDIUM';

  return 'LOW';
}

function cleanSourceLabel(source: string): string {
  const labelMap: Record<string, string> = {
    'calendar': 'Calendar',
    'crm': 'CRM',
    'policy': 'Policy',
    'hrms': 'HRMS',
    'email': 'Email',
    'receipt': 'Receipt Scanner',
    'receipt_scanner': 'Receipt Scanner',
    'transaction_history': 'Transaction History',
    'pattern_analysis': 'Pattern Analysis',
    'booking_system': 'Booking System',
    'pre_approval': 'Pre-Approval',
    'payment_gateway': 'Payment Gateway',
  };
  return labelMap[source.toLowerCase()] || source;
}
