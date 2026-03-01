'use client';

import { create } from 'zustand';

interface ExpenseItem {
  id: string;
  description: string;
  vendor: string;
  date: string;
  amount: number;
  currency: string;
  category: string;
  original_category: string | null;
  confidence: number;
  sources: string[];
  reasoning: string;
  policy_status: string;
  flag_reason: string | null;
  recommendation: string;
}

interface MissingItem {
  id: string;
  detected_gap: string;
  estimated_amount: number;
  currency: string;
  evidence: string;
  confidence: number;
  action_needed: string;
}

interface ReportSummary {
  total_items: number;
  auto_approve_count: number;
  review_count: number;
  missing_count: number;
  total_amount: number;
  overall_confidence: number;
}

interface Report {
  id: string;
  traveler: string;
  trip_summary: string;
  total_amount: number;
  currency: string;
  cost_center: string;
  approver: string;
  items: ExpenseItem[];
  flagged_items: ExpenseItem[];
  missing_items: MissingItem[];
  summary: ReportSummary;
}

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: number;
  actions?: Array<{
    type: string;
    item_id?: string;
    old_value?: string | number;
    new_value?: string | number;
    reasoning?: string;
  }>;
}

interface LoadingStep {
  label: string;
  status: 'pending' | 'active' | 'done';
}

interface ChatState {
  // Splash & loading
  showBeforeSplash: boolean;
  loadingSteps: LoadingStep[];
  isAssemblyLoading: boolean;
  assemblyData: { report: Report } | null;

  // Messages
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingMessageId: string | null;
  streamBuffer: string;

  // Report (mutable copy)
  report: Report | null;
  reportVersion: number;

  // Edit states
  editingCell: { itemId: string; field: 'category' | 'amount' } | null;
  addingItem: boolean;
  removingItemId: string | null;

  // Interaction
  inputText: string;
  isSubmitting: boolean;
  hasSubmitted: boolean;
  showSubmitButton: boolean;

  // Scenario
  activeScenario: string;

  // Actions
  setShowBeforeSplash: (show: boolean) => void;
  setLoadingSteps: (steps: LoadingStep[]) => void;
  updateLoadingStep: (index: number, status: LoadingStep['status']) => void;
  setAssemblyLoading: (loading: boolean) => void;
  setAssemblyData: (data: { report: Report } | null) => void;
  setReport: (report: Report | null) => void;
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, content: string) => void;
  appendToStream: (token: string) => void;
  setStreaming: (streaming: boolean, messageId?: string | null) => void;
  setStreamBuffer: (buffer: string) => void;
  setInputText: (text: string) => void;
  setEditingCell: (cell: ChatState['editingCell']) => void;
  setAddingItem: (adding: boolean) => void;
  setRemovingItemId: (id: string | null) => void;
  setSubmitting: (submitting: boolean) => void;
  setHasSubmitted: (submitted: boolean) => void;
  setShowSubmitButton: (show: boolean) => void;
  setActiveScenario: (scenario: string) => void;
  updateExpenseItem: (itemId: string, updates: Partial<ExpenseItem>) => void;
  removeExpenseItem: (itemId: string) => void;
  addExpenseItem: (item: ExpenseItem) => void;
  updateReportTotal: () => void;
  resetChat: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  showBeforeSplash: false,
  loadingSteps: [
    { label: 'Checking card transactions...', status: 'pending' },
    { label: 'Matching calendar events...', status: 'pending' },
    { label: 'Cross-referencing CRM records...', status: 'pending' },
    { label: 'Applying policy rules...', status: 'pending' },
    { label: 'Assembling expense report...', status: 'pending' },
  ],
  isAssemblyLoading: false,
  assemblyData: null,
  messages: [],
  isStreaming: false,
  streamingMessageId: null,
  streamBuffer: '',
  report: null,
  reportVersion: 0,
  editingCell: null,
  addingItem: false,
  removingItemId: null,
  inputText: '',
  isSubmitting: false,
  hasSubmitted: false,
  showSubmitButton: false,
  activeScenario: 'mumbai-trip',

  // Actions
  setShowBeforeSplash: (show) => set({ showBeforeSplash: show }),
  setLoadingSteps: (steps) => set({ loadingSteps: steps }),
  updateLoadingStep: (index, status) => set((state) => {
    const steps = [...state.loadingSteps];
    if (steps[index]) steps[index] = { ...steps[index], status };
    return { loadingSteps: steps };
  }),
  setAssemblyLoading: (loading) => set({ isAssemblyLoading: loading }),
  setAssemblyData: (data) => set({ assemblyData: data }),
  setReport: (report) => set({ report, reportVersion: get().reportVersion + 1 }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  updateMessage: (id, content) => set((state) => ({
    messages: state.messages.map((m) => m.id === id ? { ...m, content } : m),
  })),
  appendToStream: (token) => set((state) => {
    const msgId = state.streamingMessageId;
    if (!msgId) return state;
    return {
      streamBuffer: state.streamBuffer + token,
      messages: state.messages.map((m) => m.id === msgId ? { ...m, content: m.content + token } : m),
    };
  }),
  setStreaming: (streaming, messageId = null) => set({ isStreaming: streaming, streamingMessageId: messageId, streamBuffer: streaming ? '' : get().streamBuffer }),
  setStreamBuffer: (buffer) => set({ streamBuffer: buffer }),
  setInputText: (text) => set({ inputText: text }),
  setEditingCell: (cell) => set({ editingCell: cell }),
  setAddingItem: (adding) => set({ addingItem: adding }),
  setRemovingItemId: (id) => set({ removingItemId: id }),
  setSubmitting: (submitting) => set({ isSubmitting: submitting }),
  setHasSubmitted: (submitted) => set({ hasSubmitted: submitted }),
  setShowSubmitButton: (show) => set({ showSubmitButton: show }),
  setActiveScenario: (scenario) => set({ activeScenario: scenario }),
  updateExpenseItem: (itemId, updates) => set((state) => {
    if (!state.report) return state;
    const items = state.report.items.map((item) =>
      item.id === itemId ? { ...item, ...updates } : item
    );
    return { report: { ...state.report, items }, reportVersion: state.reportVersion + 1 };
  }),
  removeExpenseItem: (itemId) => set((state) => {
    if (!state.report) return state;
    const items = state.report.items.filter((item) => item.id !== itemId);
    return { report: { ...state.report, items }, reportVersion: state.reportVersion + 1 };
  }),
  addExpenseItem: (item) => set((state) => {
    if (!state.report) return state;
    const items = [...state.report.items, item];
    return { report: { ...state.report, items }, reportVersion: state.reportVersion + 1 };
  }),
  updateReportTotal: () => set((state) => {
    if (!state.report) return state;
    const total = state.report.items.reduce((sum, item) => sum + item.amount, 0);
    return {
      report: {
        ...state.report,
        total_amount: total,
        summary: { ...state.report.summary, total_amount: total },
      },
      reportVersion: state.reportVersion + 1,
    };
  }),
  resetChat: () => set({
    messages: [],
    isStreaming: false,
    streamingMessageId: null,
    streamBuffer: '',
    report: null,
    reportVersion: 0,
    editingCell: null,
    addingItem: false,
    removingItemId: null,
    inputText: '',
    isSubmitting: false,
    hasSubmitted: false,
    showSubmitButton: false,
    assemblyData: null,
    isAssemblyLoading: false,
  }),
}));
