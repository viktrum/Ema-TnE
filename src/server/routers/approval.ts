import { z } from "zod/v4";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "@/server/trpc/init";

export const approvalRouter = router({
  approve: protectedProcedure
    .input(z.object({
      reportId: z.number(), // dashboard_reports.id is SERIAL
      itemId: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Insert approval record
      const { error } = await ctx.supabase.from("approvals").insert({
        report_id: String(input.reportId),
        item_id: input.itemId || null,
        reviewer_id: ctx.user.id,
        action: "approve",
        notes: input.notes || null,
      });

      if (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to approve" });
      }

      // Update dashboard_reports status
      await ctx.supabase
        .from("dashboard_reports")
        .update({ status: "auto_approved" })
        .eq("id", input.reportId);

      // Log to audit
      await ctx.supabase.from("audit_log").insert({
        event_type: "approve",
        user_id: ctx.user.id,
        report_id: String(input.reportId),
        details: { item_id: input.itemId, notes: input.notes },
      });

      return { success: true };
    }),

  reject: protectedProcedure
    .input(z.object({
      reportId: z.number(),
      reason: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase.from("approvals").insert({
        report_id: String(input.reportId),
        reviewer_id: ctx.user.id,
        action: "reject",
        reason: input.reason,
        notes: input.notes || null,
      });

      if (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to reject" });
      }

      await ctx.supabase.from("audit_log").insert({
        event_type: "reject",
        user_id: ctx.user.id,
        report_id: String(input.reportId),
        details: { reason: input.reason, notes: input.notes },
      });

      return { success: true };
    }),

  askEmployee: protectedProcedure
    .input(z.object({
      reportId: z.number(),
      question: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase.from("approvals").insert({
        report_id: String(input.reportId),
        reviewer_id: ctx.user.id,
        action: "ask_employee",
        notes: input.question,
      });

      if (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to send question" });
      }

      await ctx.supabase.from("audit_log").insert({
        event_type: "ask_employee",
        user_id: ctx.user.id,
        report_id: String(input.reportId),
        details: { question: input.question },
      });

      return { success: true };
    }),
});
