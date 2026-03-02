import { z } from "zod/v4";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "@/server/trpc/init";
import type { SupabaseClient } from "@supabase/supabase-js";

// Escape HTML to prevent XSS when embedding user input in notification HTML
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Look up reviewer name from users table
async function getReviewerName(supabase: SupabaseClient, userId: string): Promise<string> {
  const { data } = await supabase
    .from("users")
    .select("name")
    .eq("id", userId)
    .single();
  return data?.name || 'Manager';
}

// Notify employee via chat_messages with message_type='notification'
async function notifyEmployee(
  supabase: SupabaseClient,
  reportId: number,
  content: string,
): Promise<void> {
  // Get scenario_id from dashboard_reports
  const { data: dashReport, error: dashError } = await supabase
    .from("dashboard_reports")
    .select("scenario_id")
    .eq("id", reportId)
    .single();

  if (dashError || !dashReport?.scenario_id) {
    console.error("notifyEmployee: dashboard_reports lookup failed", dashError);
    return;
  }

  // Find the employee who submitted this report
  const { data: report, error: reportError } = await supabase
    .from("reports")
    .select("user_id, scenario_id")
    .eq("scenario_id", dashReport.scenario_id)
    .eq("status", "submitted")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (reportError || !report?.user_id) {
    console.error("notifyEmployee: reports lookup failed", reportError);
    return;
  }

  // Insert Ema notification as a chat message (message_type='notification' for dedup)
  const { error: insertError } = await supabase.from("chat_messages").insert({
    user_id: report.user_id,
    scenario_id: report.scenario_id,
    role: "assistant",
    content,
    message_type: "notification",
  });

  if (insertError) {
    console.error("notifyEmployee: chat_messages insert failed", insertError);
  }
}

export const approvalRouter = router({
  approve: protectedProcedure
    .input(z.object({
      reportId: z.number(), // dashboard_reports.id is SERIAL
      itemId: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Insert approval record (report_id is TEXT — shared by chat and dashboard flows)
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

      const reviewerName = await getReviewerName(ctx.supabase, ctx.user.id);

      // Notify employee via chat message + audit log (parallel)
      await Promise.all([
        notifyEmployee(
          ctx.supabase,
          input.reportId,
          `<p><strong>Update:</strong> ${escapeHtml(reviewerName)} has <span style="color:#16a34a">approved</span> your expense report.</p>`,
        ),
        ctx.supabase.from("audit_log").insert({
          event_type: "approve",
          user_id: ctx.user.id,
          report_id: String(input.reportId),
          details: { item_id: input.itemId, notes: input.notes },
        }),
      ]);

      return { success: true };
    }),

  reject: protectedProcedure
    .input(z.object({
      reportId: z.number(),
      reason: z.string().max(2000),
      notes: z.string().max(2000).optional(),
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

      // Update dashboard_reports status to rejected
      await ctx.supabase
        .from("dashboard_reports")
        .update({ status: "rejected" })
        .eq("id", input.reportId);

      const reviewerName = await getReviewerName(ctx.supabase, ctx.user.id);
      const safeReason = escapeHtml(input.reason);
      const safeNotes = input.notes ? ` ${escapeHtml(input.notes)}` : '';

      await Promise.all([
        notifyEmployee(
          ctx.supabase,
          input.reportId,
          `<p><strong>Update:</strong> ${escapeHtml(reviewerName)} has <span style="color:#dc2626">rejected</span> your expense report. Reason: ${safeReason}.${safeNotes}</p>`,
        ),
        ctx.supabase.from("audit_log").insert({
          event_type: "reject",
          user_id: ctx.user.id,
          report_id: String(input.reportId),
          details: { reason: input.reason, notes: input.notes },
        }),
      ]);

      return { success: true };
    }),

  askEmployee: protectedProcedure
    .input(z.object({
      reportId: z.number(),
      question: z.string().max(2000),
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

      // Update dashboard_reports status to pending_info
      await ctx.supabase
        .from("dashboard_reports")
        .update({ status: "pending_info" })
        .eq("id", input.reportId);

      const reviewerName = await getReviewerName(ctx.supabase, ctx.user.id);

      await Promise.all([
        notifyEmployee(
          ctx.supabase,
          input.reportId,
          `<p><strong>Question from ${escapeHtml(reviewerName)}:</strong> ${escapeHtml(input.question)}</p>`,
        ),
        ctx.supabase.from("audit_log").insert({
          event_type: "ask_employee",
          user_id: ctx.user.id,
          report_id: String(input.reportId),
          details: { question: input.question },
        }),
      ]);

      return { success: true };
    }),
});
