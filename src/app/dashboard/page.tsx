'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { trpc } from '@/lib/trpc/client';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { toast } from 'sonner';
import { NorthStarBanner } from '@/components/dashboard/NorthStarBanner';
import { ReportList } from '@/components/dashboard/ReportList';
import { FlaggedPanel } from '@/components/dashboard/FlaggedPanel';
import { StatsPanel } from '@/components/dashboard/StatsPanel';

const REJECT_REASONS = [
  'Policy Violation',
  'Insufficient Documentation',
  'Amount Exceeds Limit',
  'Duplicate Expense',
  'Other',
] as const;

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const {
    heroMetric,
    autoApproved,
    flagged,
    health,
    expandedFlagId,
    activeModal,
    modalTargetId,
    isLoading,
    setAutoApproved,
    setFlagged,
    setHealth,
    setExpandedFlagId,
    setActiveModal,
    setLoading,
    removeFlaggedItem,
  } = useDashboardStore();

  // Modal form state
  const [rejectReason, setRejectReason] = useState<string>(REJECT_REASONS[0]);
  const [rejectNotes, setRejectNotes] = useState('');
  const [askQuestion, setAskQuestion] = useState('');
  const [isActionPending, setIsActionPending] = useState(false);

  // tRPC queries
  const reportsQuery = trpc.dashboard.getReports.useQuery({});
  const statsQuery = trpc.dashboard.getStats.useQuery();

  // tRPC mutations
  const approveMutation = trpc.approval.approve.useMutation();
  const rejectMutation = trpc.approval.reject.useMutation();
  const askMutation = trpc.approval.askEmployee.useMutation();

  // Auth check and initial data load
  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);

      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        toast.error('Please log in to continue.');
        router.push('/login');
        return;
      }

      // Verify role is manager/chro/admin
      // Auth metadata may be empty (dashboard-created users) — check public.users
      let role = user.user_metadata?.role?.toLowerCase() || '';
      if (!role) {
        const { data: dbUser } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        role = dbUser?.role || '';
      }
      const allowedRoles = ['manager', 'chro', 'admin'];
      if (!allowedRoles.includes(role)) {
        router.push('/chat');
        return;
      }

      if (!cancelled) {
        setLoading(false);
      }
    }

    init();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync tRPC query data into Zustand store
  useEffect(() => {
    if (reportsQuery.data) {
      const { autoApproved: autoData, flagged: flaggedData } = reportsQuery.data;

      setAutoApproved({
        count: autoData.length,
        percentage: autoData.length + flaggedData.length > 0
          ? Math.round((autoData.length / (autoData.length + flaggedData.length)) * 100)
          : 0,
        reports: autoData.map((r: any) => ({
          id: r.id,
          traveler_name: r.traveler_name || 'Unknown',
          traveler_role: r.traveler_role || '',
          traveler_initials: r.traveler_initials || getInitials(r.traveler_name || 'U'),
          destination: r.destination || '',
          dates: r.dates || '',
          total_amount: r.total_amount || 0,
          currency: r.currency || 'INR',
          item_count: r.item_count || 0,
          avg_confidence: r.avg_confidence || 0,
        })),
      });

      setFlagged({
        count: flaggedData.length,
        percentage: autoData.length + flaggedData.length > 0
          ? Math.round((flaggedData.length / (autoData.length + flaggedData.length)) * 100)
          : 0,
        featuredId: flaggedData.length > 0 ? flaggedData[0].id : null,
        items: flaggedData.map((r: any) => ({
          id: r.id,
          traveler_name: r.traveler_name || 'Unknown',
          traveler_role: r.traveler_role || '',
          traveler_initials: r.traveler_initials || getInitials(r.traveler_name || 'U'),
          destination: r.destination || '',
          dates: r.dates || '',
          total_amount: r.total_amount || 0,
          currency: r.currency || 'INR',
          item_count: r.item_count || 0,
          avg_confidence: r.avg_confidence || 0,
          flag_reason: r.flag_reason || '',
          flag_severity: r.flag_severity || 'MEDIUM',
          items: r.items || [],
          reasoning: r.reasoning || null,
          sources: r.sources || [],
          scenario_id: r.scenario_id || '',
        })),
      });

      // Expand first flagged item by default (id=1, Tanya's dinner)
      if (flaggedData.length > 0 && expandedFlagId === null) {
        setExpandedFlagId(flaggedData[0].id);
      }

      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportsQuery.data]);

  useEffect(() => {
    if (statsQuery.data) {
      const s = statsQuery.data;
      setHealth({
        stats: [
          { label: 'Reports This Month', value: s.total },
          { label: 'Auto-Approved Rate', value: `${s.autoApprovedRate}%`, change: '', trend: 'up' as const },
          { label: 'Flagged Rate', value: `${s.flaggedRate}%`, change: '', trend: 'down' as const },
          { label: 'Avg Confidence', value: `${s.avgConfidence}%`, change: '', trend: 'up' as const },
        ],
        flagTypes: health.flagTypes,
        trend: health.trend,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statsQuery.data]);

  // Supabase Realtime subscriptions
  useEffect(() => {
    const reportsChannel = supabase
      .channel('reports-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reports' },
        (payload) => {
          toast.success(`New report submitted by ${payload.new.traveler_name}`);
          reportsQuery.refetch();
          statsQuery.refetch();
        }
      )
      .subscribe();

    const approvalsChannel = supabase
      .channel('approvals-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'approvals' },
        () => {
          toast.info('Action taken on report');
          reportsQuery.refetch();
          statsQuery.refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(reportsChannel);
      supabase.removeChannel(approvalsChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Action handlers
  const handleApprove = useCallback(async (id: number) => {
    setIsActionPending(true);
    try {
      await approveMutation.mutateAsync({ reportId: id });
      toast.success('Report approved successfully.');
      removeFlaggedItem(id);
      reportsQuery.refetch();
      statsQuery.refetch();
    } catch {
      toast.error('Failed to approve report.');
    } finally {
      setIsActionPending(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReject = useCallback(async () => {
    if (!modalTargetId) return;
    setIsActionPending(true);
    try {
      await rejectMutation.mutateAsync({
        reportId: modalTargetId,
        reason: rejectReason,
        notes: rejectNotes || undefined,
      });
      toast.success('Report rejected.');
      removeFlaggedItem(modalTargetId);
      setActiveModal(null);
      setRejectReason(REJECT_REASONS[0]);
      setRejectNotes('');
      reportsQuery.refetch();
      statsQuery.refetch();
    } catch {
      toast.error('Failed to reject report.');
    } finally {
      setIsActionPending(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalTargetId, rejectReason, rejectNotes]);

  const handleAsk = useCallback(async () => {
    if (!modalTargetId || !askQuestion.trim()) return;
    setIsActionPending(true);
    try {
      await askMutation.mutateAsync({
        reportId: modalTargetId,
        question: askQuestion.trim(),
      });
      toast.success('Question sent to employee.');
      setActiveModal(null);
      setAskQuestion('');
    } catch {
      toast.error('Failed to send question.');
    } finally {
      setIsActionPending(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalTargetId, askQuestion]);

  const openRejectModal = useCallback((id: number) => {
    setRejectReason(REJECT_REASONS[0]);
    setRejectNotes('');
    setActiveModal('reject', id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAskModal = useCallback((id: number) => {
    setAskQuestion('Can you provide additional documentation for this expense?');
    setActiveModal('ask', id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Loading state
  if (isLoading || reportsQuery.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-[#1F8844]" />
          <p className="text-sm text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Top nav */}
      <nav className="flex h-12 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-gray-800">Ema T&E</span>
          <span className="text-xs text-gray-400">|</span>
          <span className="text-sm font-medium text-[#1F8844]">Dashboard</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/chat')}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            Switch to Chat
          </button>
        </div>
      </nav>

      {/* North Star Banner */}
      <div className="shrink-0 p-4 pb-0">
        <NorthStarBanner
          value={heroMetric.value}
          label={heroMetric.label}
          industryAvg={heroMetric.industryAvg}
        />
      </div>

      {/* 3-panel grid */}
      <div className="flex-1 grid grid-cols-[30%_40%_30%] gap-4 overflow-hidden p-4">
        {/* Left: Auto-approved reports */}
        <div className="overflow-y-auto rounded-xl border border-gray-200 bg-white">
          <div className="sticky top-0 z-10 border-b border-gray-100 bg-white px-4 py-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">Auto-Approved</h2>
              <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                {autoApproved.count} ({autoApproved.percentage}%)
              </span>
            </div>
          </div>
          <div className="p-3">
            <ReportList reports={autoApproved.reports} count={autoApproved.count} percentage={autoApproved.percentage} />
          </div>
        </div>

        {/* Center: Flagged items */}
        <div className="overflow-y-auto rounded-xl border border-gray-200 bg-white">
          <div className="sticky top-0 z-10 border-b border-gray-100 bg-white px-4 py-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">Flagged for Review</h2>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                {flagged.count} ({flagged.percentage}%)
              </span>
            </div>
          </div>
          <div className="p-3">
            <FlaggedPanel
              items={flagged.items}
              expandedId={expandedFlagId}
              onToggle={(id) => setExpandedFlagId(expandedFlagId === id ? null : id)}
              onApprove={handleApprove}
              onReject={openRejectModal}
              onAsk={openAskModal}
            />
          </div>
        </div>

        {/* Right: CHRO Health / Stats */}
        <div className="overflow-y-auto rounded-xl border border-gray-200 bg-white">
          <div className="sticky top-0 z-10 border-b border-gray-100 bg-white px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-800">CHRO Health</h2>
          </div>
          <div className="p-3">
            <StatsPanel
              stats={health.stats}
              flagTypes={health.flagTypes}
              trend={health.trend}
            />
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {activeModal === 'reject' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Reject Report</h3>
            <p className="mt-1 text-sm text-gray-500">
              Provide a reason for rejecting this expense report.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Reason</label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-[#1F8844] focus:outline-none focus:ring-1 focus:ring-[#1F8844]"
                >
                  {REJECT_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Notes (optional)</label>
                <textarea
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  placeholder="Additional details..."
                  rows={3}
                  className="mt-1 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-[#1F8844] focus:outline-none focus:ring-1 focus:ring-[#1F8844]"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={closeModal}
                disabled={isActionPending}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={isActionPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {isActionPending ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ask Employee Modal */}
      {activeModal === 'ask' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Ask Employee</h3>
            <p className="mt-1 text-sm text-gray-500">
              Send a question to the employee about this expense.
            </p>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Question</label>
              <textarea
                value={askQuestion}
                onChange={(e) => setAskQuestion(e.target.value)}
                rows={4}
                className="mt-1 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-[#1F8844] focus:outline-none focus:ring-1 focus:ring-[#1F8844]"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={closeModal}
                disabled={isActionPending}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAsk}
                disabled={isActionPending || !askQuestion.trim()}
                className="rounded-lg bg-[#1F8844] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#186d36] disabled:opacity-50"
              >
                {isActionPending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Helpers ---

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
