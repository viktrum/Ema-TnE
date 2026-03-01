'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { trpc } from '@/lib/trpc/client';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { toast } from 'sonner';
import {
  CheckCircle,
  XCircle,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertTriangle,
  Shield,
  Inbox,
  LogOut,
} from 'lucide-react';

const REJECT_REASONS = [
  'Policy Violation',
  'Insufficient Documentation',
  'Amount Exceeds Limit',
  'Duplicate Expense',
  'Other',
] as const;

const SEVERITY_STYLES: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-700 border-red-200',
  MEDIUM: 'bg-amber-100 text-amber-700 border-amber-200',
  LOW: 'bg-gray-100 text-gray-600 border-gray-200',
};

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const {
    autoApproved,
    flagged,
    expandedFlagId,
    activeModal,
    modalTargetId,
    isLoading,
    setAutoApproved,
    setFlagged,
    setExpandedFlagId,
    setActiveModal,
    setLoading,
    removeFlaggedItem,
  } = useDashboardStore();

  const [rejectReason, setRejectReason] = useState<string>(REJECT_REASONS[0]);
  const [rejectNotes, setRejectNotes] = useState('');
  const [askQuestion, setAskQuestion] = useState('');
  const [isActionPending, setIsActionPending] = useState(false);
  const [userName, setUserName] = useState('');

  // tRPC
  const reportsQuery = trpc.dashboard.getReports.useQuery({});
  const approveMutation = trpc.approval.approve.useMutation();
  const rejectMutation = trpc.approval.reject.useMutation();
  const askMutation = trpc.approval.askEmployee.useMutation();

  // Auth + role check
  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      let role = user.user_metadata?.role?.toLowerCase() || '';
      if (!role) {
        const { data: dbUser } = await supabase.from('users').select('role, name').eq('id', user.id).single();
        role = dbUser?.role || '';
        if (dbUser?.name) setUserName(dbUser.name);
      } else {
        setUserName(user.user_metadata?.name || user.email?.split('@')[0] || '');
      }

      if (!['manager', 'chro', 'admin'].includes(role)) {
        router.push('/chat');
        return;
      }
      if (!cancelled) setLoading(false);
    }
    init();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync data
  useEffect(() => {
    if (!reportsQuery.data) return;
    const { autoApproved: autoData, flagged: flaggedData } = reportsQuery.data;
    const total = autoData.length + flaggedData.length;

    setAutoApproved({
      count: autoData.length,
      percentage: total > 0 ? Math.round((autoData.length / total) * 100) : 0,
      reports: autoData,
    });
    setFlagged({
      count: flaggedData.length,
      percentage: total > 0 ? Math.round((flaggedData.length / total) * 100) : 0,
      featuredId: flaggedData[0]?.id ?? null,
      items: flaggedData,
    });
    if (flaggedData.length > 0 && expandedFlagId === null) {
      setExpandedFlagId(flaggedData[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportsQuery.data]);

  // Realtime
  useEffect(() => {
    const reportsChannel = supabase
      .channel('reports-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' }, (payload) => {
        toast.success(`New report from ${payload.new.traveler_name}`);
        reportsQuery.refetch();
      })
      .subscribe();

    const approvalsChannel = supabase
      .channel('approvals-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'approvals' }, () => {
        reportsQuery.refetch();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(reportsChannel);
      supabase.removeChannel(approvalsChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Actions
  const handleApprove = useCallback(async (id: number) => {
    setIsActionPending(true);
    try {
      await approveMutation.mutateAsync({ reportId: id });
      toast.success('Approved.');
      removeFlaggedItem(id);
      reportsQuery.refetch();
    } catch { toast.error('Failed to approve.'); }
    finally { setIsActionPending(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReject = useCallback(async () => {
    if (!modalTargetId) return;
    setIsActionPending(true);
    try {
      await rejectMutation.mutateAsync({ reportId: modalTargetId, reason: rejectReason, notes: rejectNotes || undefined });
      toast.success('Rejected.');
      removeFlaggedItem(modalTargetId);
      setActiveModal(null);
      setRejectReason(REJECT_REASONS[0]);
      setRejectNotes('');
      reportsQuery.refetch();
    } catch { toast.error('Failed to reject.'); }
    finally { setIsActionPending(false); }
    // eslint-disable-next-line react-hooks-exhaustive-deps
  }, [modalTargetId, rejectReason, rejectNotes]);

  const handleAsk = useCallback(async () => {
    if (!modalTargetId || !askQuestion.trim()) return;
    setIsActionPending(true);
    try {
      await askMutation.mutateAsync({ reportId: modalTargetId, question: askQuestion });
      toast.success('Question sent to employee.');
      setActiveModal(null);
      setAskQuestion('');
    } catch { toast.error('Failed to send question.'); }
    finally { setIsActionPending(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalTargetId, askQuestion]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    router.push('/login');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  const flaggedItems = flagged.items || [];
  const pendingCount = flaggedItems.length;

  return (
    <div className="flex h-screen flex-col bg-[#F9FAFB]">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1F8844] text-xs font-bold text-white">E</div>
          <span className="text-sm font-semibold text-gray-800">Ema T&E</span>
          <span className="text-xs text-gray-400">|</span>
          <span className="text-sm text-gray-500">Manager Review</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/chat')} className="text-xs text-gray-500 hover:text-[#1F8844]">
            Switch to Chat
          </button>
          <span className="text-xs text-gray-400">{userName}</span>
          <button onClick={handleLogout} className="text-gray-400 hover:text-gray-600">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Stats bar — compact, not a hero */}
      <div className="border-b border-gray-100 bg-white px-6 py-3">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Inbox className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold text-gray-800">{pendingCount} items need your review</span>
          </div>
          <div className="h-4 w-px bg-gray-200" />
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>{autoApproved.count} auto-approved ({autoApproved.percentage}%)</span>
            <span>·</span>
            <span>{autoApproved.count + pendingCount} total this month</span>
          </div>
        </div>
      </div>

      {/* Inbox */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto max-w-3xl space-y-3">
          {flaggedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <CheckCircle className="mb-3 h-10 w-10 text-green-400" />
              <p className="text-sm font-medium">All clear. No items need your review.</p>
            </div>
          ) : (
            flaggedItems.map((item) => {
              const isExpanded = expandedFlagId === item.id;
              const severity = (item as { flag_severity?: string }).flag_severity || 'MEDIUM';
              const reasoning = typeof (item as { reasoning?: unknown }).reasoning === 'object' && (item as { reasoning?: { summary?: string } }).reasoning
                ? ((item as { reasoning?: { summary?: string } }).reasoning?.summary || '')
                : String((item as { reasoning?: unknown }).reasoning || '');
              const sources: string[] = (item as { sources?: string[] }).sources || [];

              return (
                <div
                  key={item.id}
                  className={`rounded-xl border bg-white transition-shadow ${
                    isExpanded ? 'shadow-md border-gray-300' : 'shadow-sm border-gray-200 hover:shadow-md'
                  }`}
                >
                  {/* Collapsed header — always visible */}
                  <button
                    type="button"
                    onClick={() => setExpandedFlagId(isExpanded ? null : item.id)}
                    className="flex w-full items-center gap-4 px-5 py-4 text-left"
                  >
                    {/* Severity indicator */}
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                      severity === 'HIGH' ? 'bg-red-100' : severity === 'MEDIUM' ? 'bg-amber-100' : 'bg-gray-100'
                    }`}>
                      <AlertTriangle className={`h-4 w-4 ${
                        severity === 'HIGH' ? 'text-red-600' : severity === 'MEDIUM' ? 'text-amber-600' : 'text-gray-500'
                      }`} />
                    </div>

                    {/* Item info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800 truncate">
                          {item.traveler_name}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${SEVERITY_STYLES[severity]}`}>
                          {severity}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500 truncate">
                        {item.flag_reason || `${item.destination} · ₹${item.total_amount?.toLocaleString('en-IN')}`}
                      </p>
                    </div>

                    {/* Amount + expand icon */}
                    <span className="shrink-0 text-sm font-mono font-semibold text-gray-700">
                      ₹{item.total_amount?.toLocaleString('en-IN')}
                    </span>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 px-5 pb-4 pt-3">
                      {/* Context row */}
                      <div className="mb-3 flex items-center gap-3 text-xs text-gray-500">
                        <span>{item.destination}</span>
                        <span>·</span>
                        <span>{item.dates}</span>
                        <span>·</span>
                        <span>{item.avg_confidence}% confidence</span>
                      </div>

                      {/* AI Reasoning */}
                      {reasoning && (
                        <div className="mb-4 rounded-lg bg-gray-50 p-3">
                          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                            <Shield className="h-3 w-3" />
                            AI Reasoning
                          </div>
                          <p className="text-[13px] leading-relaxed text-gray-700">{reasoning}</p>
                        </div>
                      )}

                      {/* Source badges */}
                      {sources.length > 0 && (
                        <div className="mb-4 flex flex-wrap gap-1.5">
                          {sources.map((source) => (
                            <span key={source} className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                              {source}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApprove(item.id)}
                          disabled={isActionPending}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#1F8844] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#176B36] disabled:opacity-50"
                        >
                          <CheckCircle className="h-3.5 w-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => { setActiveModal('reject', item.id); }}
                          disabled={isActionPending}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-4 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Reject
                        </button>
                        <button
                          onClick={() => {
                            setAskQuestion(`Can you provide additional context for this expense? (${item.flag_reason || 'flagged for review'})`);
                            setActiveModal('ask', item.id);
                          }}
                          disabled={isActionPending}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                        >
                          <MessageCircle className="h-3.5 w-3.5" /> Ask Employee
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {activeModal === 'reject' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-sm font-semibold text-gray-800">Reject Expense</h3>
            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium text-gray-600">Reason</label>
              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#1F8844] focus:outline-none focus:ring-1 focus:ring-[#1F8844]"
              >
                {REJECT_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-gray-600">Notes (optional)</label>
              <textarea
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#1F8844] focus:outline-none focus:ring-1 focus:ring-[#1F8844]"
                placeholder="Add context for the employee..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setActiveModal(null)} className="rounded-lg px-4 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={isActionPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
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
            <h3 className="mb-4 text-sm font-semibold text-gray-800">Ask Employee</h3>
            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-gray-600">Your question</label>
              <textarea
                value={askQuestion}
                onChange={(e) => setAskQuestion(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#1F8844] focus:outline-none focus:ring-1 focus:ring-[#1F8844]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setActiveModal(null)} className="rounded-lg px-4 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={handleAsk}
                disabled={isActionPending || !askQuestion.trim()}
                className="rounded-lg bg-[#1F8844] px-4 py-2 text-xs font-medium text-white hover:bg-[#176B36] disabled:opacity-50"
              >
                {isActionPending ? 'Sending...' : 'Send Question'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
