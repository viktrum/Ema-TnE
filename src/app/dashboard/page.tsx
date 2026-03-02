'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { trpc } from '@/lib/trpc/client';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { toast } from 'sonner';
import { LogOut } from 'lucide-react';

import { groupFlaggedItems, classifyFlaggedItem } from '@/lib/utils/classifyFlaggedItems';
import { EmaBriefingBar } from '@/components/dashboard/EmaBriefingBar';
import { FlaggedPanel } from '@/components/dashboard/FlaggedPanel';
import { NorthStarBanner } from '@/components/dashboard/NorthStarBanner';
import { StatsPanel } from '@/components/dashboard/StatsPanel';
import { RejectModal } from '@/components/dashboard/RejectModal';
import { AskModal } from '@/components/dashboard/AskModal';

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const {
    activeView,
    autoApproved,
    flagged,
    heroMetric,
    health,
    expandedFlagIds,
    activeModal,
    modalTargetId,
    animatingApprovalId,
    animationPhase,
    aiRecommendations,
    isAiLoading,
    isLoading,
    setActiveView,
    setAutoApproved,
    setFlagged,
    toggleExpandedFlag,
    initExpandedFlags,
    setActiveModal,
    setAnimationPhase,
    setAiRecommendations,
    setAiLoading,
    setLoading,
    removeFlaggedItem,
    addToast,
  } = useDashboardStore();

  const [isActionPending, setIsActionPending] = useState(false);
  const [userName, setUserName] = useState('');
  const [aiFetched, setAiFetched] = useState(false);

  // tRPC
  const reportsQuery = trpc.dashboard.getReports.useQuery({});
  const approveMutation = trpc.approval.approve.useMutation();
  const rejectMutation = trpc.approval.reject.useMutation();
  const askMutation = trpc.approval.askEmployee.useMutation();
  const aiMutation = trpc.dashboard.getAiRecommendations.useMutation({
    onSuccess: (data) => {
      console.log('[AI Mutation] onSuccess, keys:', data ? Object.keys(data).length : 'null');
      if (data && Object.keys(data).length > 0) {
        setAiRecommendations(data);
      } else {
        setAiLoading(false);
      }
    },
    onError: (err) => {
      console.error('[AI Mutation] onError:', err.message);
      setAiLoading(false);
    },
  });

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

  // Sync data from tRPC
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

    // Auto-expand Tier 1 items
    const tierGroups = groupFlaggedItems(flaggedData);
    const decisionGroup = tierGroups.find((g) => g.tier === 'decision');
    if (decisionGroup && expandedFlagIds.size === 0) {
      initExpandedFlags(decisionGroup.items.map((i) => i.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportsQuery.data]);

  // Fire AI recommendations only for "Needs Your Call" (decision tier) items
  useEffect(() => {
    const items = flagged.items || [];
    if (items.length > 0 && !aiFetched && !aiRecommendations) {
      // Only AI-analyze decision-tier items (HIGH severity, complex signals)
      const decisionIds = items
        .filter((i) => classifyFlaggedItem(i) === 'decision')
        .map((i) => i.id);
      console.log('[AI Mutation] Firing for decision-tier IDs:', decisionIds);
      setAiFetched(true);
      if (decisionIds.length > 0) {
        setAiLoading(true);
        aiMutation.mutate({ itemIds: decisionIds });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flagged.items, aiFetched, aiRecommendations]);

  // Realtime subscriptions
  useEffect(() => {
    const reportsChannel = supabase
      .channel('dashboard-reports-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dashboard_reports' }, (payload) => {
        const newReport = payload.new as any;
        toast.success(`New report from ${newReport.traveler_name || 'an employee'}`, {
          description: newReport.status === 'flagged' ? 'Needs your review' : 'Auto-approved',
        });
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

  // Approve with animation (respects prefers-reduced-motion)
  const handleApprove = useCallback(async (id: number) => {
    setIsActionPending(true);
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    try {
      await approveMutation.mutateAsync({ reportId: id });

      if (prefersReducedMotion) {
        // Skip animation, remove immediately
        removeFlaggedItem(id, 'approve');
        toast.success('Approved — employee notified.');
        reportsQuery.refetch();
      } else {
        // Animation sequence: flash → overlay → collapse → remove
        setAnimationPhase(id, 'flash');
        setTimeout(() => setAnimationPhase(id, 'overlay'), 300);
        setTimeout(() => setAnimationPhase(id, 'collapsing'), 1100);
        setTimeout(() => {
          removeFlaggedItem(id, 'approve');
          toast.success('Approved — employee notified.');
          reportsQuery.refetch();
        }, 1400);
      }
    } catch {
      setAnimationPhase(null, null);
      toast.error('Failed to approve.');
    } finally {
      setIsActionPending(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReject = useCallback(async (data: { reason: string; notes?: string }) => {
    if (!modalTargetId) return;
    setIsActionPending(true);
    try {
      await rejectMutation.mutateAsync({ reportId: modalTargetId, reason: data.reason, notes: data.notes });
      toast.success('Rejected.');
      removeFlaggedItem(modalTargetId, 'reject');
      setActiveModal(null);
      reportsQuery.refetch();
    } catch { toast.error('Failed to reject.'); }
    finally { setIsActionPending(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalTargetId]);

  const handleAsk = useCallback(async (question: string) => {
    if (!modalTargetId || !question.trim()) return;
    setIsActionPending(true);
    try {
      await askMutation.mutateAsync({ reportId: modalTargetId, question });
      toast.success('Question sent to employee.');
      setActiveModal(null);
    } catch { toast.error('Failed to send question.'); }
    finally { setIsActionPending(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalTargetId]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    router.push('/login');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tier counts for briefing bar
  const tierCounts = useMemo(() => {
    const groups = groupFlaggedItems(flagged.items || []);
    return {
      decision: groups.find((g) => g.tier === 'decision')?.items.length ?? 0,
      review: groups.find((g) => g.tier === 'review')?.items.length ?? 0,
      autoHandled: groups.find((g) => g.tier === 'auto-handled')?.items.length ?? 0,
    };
  }, [flagged.items]);

  // Default ask question for the modal
  const modalTargetItem = flagged.items?.find((i) => i.id === modalTargetId);
  const defaultAskQuestion = modalTargetItem
    ? `Can you provide additional context for this expense? (${modalTargetItem.flag_reason || 'flagged for review'})`
    : '';

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[#F9FAFB]">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1F8844] text-xs font-bold text-white">E</div>
          <span className="text-sm font-semibold text-gray-800">Ema T&E</span>
          <span className="text-xs text-gray-400">|</span>

          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
            <button
              onClick={() => setActiveView('manager')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                activeView === 'manager'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Manager
            </button>
            <button
              onClick={() => setActiveView('admin')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                activeView === 'admin'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Admin
            </button>
          </div>
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto max-w-4xl space-y-4">
          {activeView === 'manager' ? (
            <>
              {/* Zone 1: Ema's Briefing */}
              <EmaBriefingBar
                decisionCount={tierCounts.decision}
                reviewCount={tierCounts.review}
                autoHandledCount={tierCounts.autoHandled}
                autoApprovedCount={autoApproved.count}
                totalCount={autoApproved.count + (flagged.items?.length || 0)}
                userName={userName}
              />

              {/* Zone 2: Three-tier inbox */}
              <FlaggedPanel
                items={flagged.items || []}
                expandedFlagIds={expandedFlagIds}
                onToggleExpand={toggleExpandedFlag}
                onApprove={handleApprove}
                onReject={(id) => setActiveModal('reject', id)}
                onAsk={(id) => setActiveModal('ask', id)}
                animatingApprovalId={animatingApprovalId}
                animationPhase={animationPhase}
                disabled={isActionPending}
                aiRecommendations={aiRecommendations}
                isAiLoading={isAiLoading}
              />
            </>
          ) : (
            <>
              {/* Zone A: Hero Banner */}
              <NorthStarBanner
                heroMetric={heroMetric}
                autoApprovedCount={autoApproved.count}
                autoApprovedRate={autoApproved.percentage}
                policyCompliance={health.stats.find((s) => s.label === 'Policy Compliance')?.value?.toString() || '96%'}
              />

              {/* Zone B: Health Stats + Flag Distribution */}
              <StatsPanel
                stats={health.stats}
                flagTypes={health.flagTypes}
                trend={health.trend}
              />

              {/* Zone C: Flagged items (read-only) */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-700">Flagged Items (Read-Only)</h3>
                <FlaggedPanel
                  items={flagged.items || []}
                  expandedFlagIds={expandedFlagIds}
                  onToggleExpand={toggleExpandedFlag}
                  onApprove={() => {}}
                  onReject={() => {}}
                  onAsk={() => {}}
                  animatingApprovalId={null}
                  animationPhase={null}
                  readOnly
                  aiRecommendations={aiRecommendations}
                  isAiLoading={aiMutation.isPending}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {activeModal === 'reject' && (
        <RejectModal
          onConfirm={handleReject}
          onCancel={() => setActiveModal(null)}
          isPending={isActionPending}
        />
      )}
      {activeModal === 'ask' && (
        <AskModal
          defaultQuestion={defaultAskQuestion}
          onConfirm={handleAsk}
          onCancel={() => setActiveModal(null)}
          isPending={isActionPending}
        />
      )}
    </div>
  );
}
