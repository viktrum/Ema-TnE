import { z } from "zod/v4";
import { protectedProcedure, router } from "@/server/trpc/init";

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
});
