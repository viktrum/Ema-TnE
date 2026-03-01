import { z } from "zod/v4";
import { protectedProcedure, router } from "@/server/trpc/init";

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

  list: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from("scenarios")
      .select("id, name, destination, start_date, end_date");

    if (error) throw error;
    return data;
  }),
});
