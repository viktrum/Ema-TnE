'use client';

import { create } from 'zustand';

interface AutoApprovedReport {
  id: number;
  traveler_name: string;
  traveler_role: string;
  traveler_initials: string;
  destination: string;
  dates: string;
  total_amount: number;
  currency: string;
  item_count: number;
  avg_confidence: number;
  items?: any[];
}

interface FlaggedItem {
  id: number;
  traveler_name: string;
  traveler_role?: string;
  traveler_initials?: string;
  destination: string;
  dates: string;
  total_amount: number;
  currency: string;
  item_count: number;
  avg_confidence: number;
  flag_reason: string;
  flag_severity: 'LOW' | 'MEDIUM' | 'HIGH';
  items?: any[];
  reasoning?: any;
  sources?: string[];
  scenario_id?: string;
}

interface HealthStat {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down';
}

interface FlagTypeBar {
  type: string;
  count: number;
}

interface TrendPoint {
  week: string;
  rate: number;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

type AnimationPhase = 'flash' | 'overlay' | 'collapsing' | null;

interface DashboardState {
  activeScenario: string;
  activeView: 'manager' | 'admin';

  heroMetric: { value: string; label: string; industryAvg: string };

  autoApproved: { count: number; percentage: number; reports: AutoApprovedReport[] };
  flagged: { count: number; percentage: number; featuredId: number | null; items: FlaggedItem[] };
  health: { stats: HealthStat[]; flagTypes: FlagTypeBar[]; trend: TrendPoint[] };

  expandedFlagIds: Set<number>;
  activeModal: 'reject' | 'ask' | null;
  modalTargetId: number | null;
  animatingApprovalId: number | null;
  animationPhase: AnimationPhase;
  toasts: Toast[];
  isLoading: boolean;

  // Actions
  setActiveScenario: (scenario: string) => void;
  setActiveView: (view: 'manager' | 'admin') => void;
  setAutoApproved: (data: DashboardState['autoApproved']) => void;
  setFlagged: (data: DashboardState['flagged']) => void;
  setHealth: (data: DashboardState['health']) => void;
  toggleExpandedFlag: (id: number) => void;
  initExpandedFlags: (ids: number[]) => void;
  setActiveModal: (modal: DashboardState['activeModal'], targetId?: number | null) => void;
  setAnimationPhase: (id: number | null, phase: AnimationPhase) => void;
  addToast: (toast: Toast) => void;
  removeToast: (id: string) => void;
  setLoading: (loading: boolean) => void;
  removeFlaggedItem: (id: number, action: 'approve' | 'reject' | 'ask') => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  activeScenario: 'mumbai-trip',
  activeView: 'manager',

  heroMetric: { value: '4 hours', label: 'Trip-end to submitted report', industryAvg: '8+ days' },

  autoApproved: { count: 38, percentage: 81, reports: [] },
  flagged: { count: 9, percentage: 19, featuredId: null, items: [] },
  health: {
    stats: [
      { label: 'Reports This Month', value: 47 },
      { label: 'Auto-Approved Rate', value: '81%', change: '↑ 7%', trend: 'up' },
      { label: 'Flagged Rate', value: '19%', change: '↓ 7%', trend: 'down' },
      { label: 'Avg Confidence', value: '93%', change: '↑ 4%', trend: 'up' },
      { label: 'Avg Processing Time', value: '4 hrs', change: '↓ from 5.2 days', trend: 'down' },
      { label: 'Policy Compliance', value: '96%', change: '↑ 5%', trend: 'up' },
    ],
    flagTypes: [
      { type: 'Missing Receipt', count: 3 },
      { type: 'Policy Exceedance', count: 2 },
      { type: 'Re-categorization', count: 2 },
      { type: 'Duplicate', count: 1 },
      { type: 'Date Mismatch', count: 1 },
    ],
    trend: [
      { week: 'Week 1', rate: 74 },
      { week: 'Week 2', rate: 77 },
      { week: 'Week 3', rate: 79 },
      { week: 'Week 4', rate: 81 },
    ],
  },

  expandedFlagIds: new Set<number>(),
  activeModal: null,
  modalTargetId: null,
  animatingApprovalId: null,
  animationPhase: null,
  toasts: [],
  isLoading: true,

  setActiveScenario: (scenario) => set({ activeScenario: scenario }),
  setActiveView: (view) => set({ activeView: view }),
  setAutoApproved: (data) => set({ autoApproved: data }),
  setFlagged: (data) => set({ flagged: data }),
  setHealth: (data) => set({ health: data }),
  toggleExpandedFlag: (id) =>
    set((state) => {
      const next = new Set(state.expandedFlagIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { expandedFlagIds: next };
    }),
  initExpandedFlags: (ids) => set({ expandedFlagIds: new Set(ids) }),
  setActiveModal: (modal, targetId = null) => set({ activeModal: modal, modalTargetId: targetId }),
  setAnimationPhase: (id, phase) => set({ animatingApprovalId: id, animationPhase: phase }),
  addToast: (toast) => set((state) => ({ toasts: [...state.toasts, toast] })),
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  setLoading: (loading) => set({ isLoading: loading }),
  removeFlaggedItem: (id, action) =>
    set((state) => ({
      flagged: {
        ...state.flagged,
        count: state.flagged.count - 1,
        items: state.flagged.items.filter((item) => item.id !== id),
      },
      autoApproved: {
        ...state.autoApproved,
        count: action === 'approve' ? state.autoApproved.count + 1 : state.autoApproved.count,
      },
      animatingApprovalId: null,
      animationPhase: null,
    })),
}));
