import { z } from "zod/v4";
import { protectedProcedure, publicProcedure, router } from "@/server/trpc/init";

export const scenarioRouter = router({
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("scenarios")
        .select("*")
        .eq("id", input.id)
        .single();

      if (error) throw error;
      return data;
    }),

  list: publicProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from("scenarios")
      .select("id, name, destination, start_date, end_date, trip_type, purpose, transactions, context");

    if (error) throw error;

    return (data || []).map((s) => {
      const context = s.context as Record<string, unknown> | null;
      const hrms = context?.hrms as Record<string, unknown> | null;
      return {
        id: s.id as string,
        name: s.name as string,
        destination: s.destination as string,
        start_date: s.start_date as string,
        end_date: s.end_date as string,
        trip_type: (s.trip_type as string) || 'domestic',
        purpose: (s.purpose as string) || '',
        item_count: Array.isArray(s.transactions) ? s.transactions.length : 0,
        traveler_name: (hrms?.employee_name as string) || 'Unknown',
      };
    });
  }),
});
