'use client';

import AttentionCard from '@/components/chat/AttentionCard';
import AutoApprovedSummary from '@/components/chat/AutoApprovedSummary';

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

interface Report {
  id: string;
  traveler: string;
  trip_summary: string;
  total_amount: number;
  currency: string;
  cost_center: string;
  approver: string;
  items: ExpenseItem[];
  flagged_items: { id: string }[];
  missing_items: MissingItem[];
  summary: {
    total_items: number;
    auto_approve_count: number;
    review_count: number;
    missing_count: number;
    total_amount: number;
    overall_confidence: number;
  };
}

interface ExpenseReportCardProps {
  report: Report;
  editingCategoryId: string | null;
  editingAmountId: string | null;
  onEditCategory: (id: string) => void;
  onCategoryChange: (id: string, current: string, next: string) => void;
  onCancelEditCategory: () => void;
  onEditAmount: (id: string) => void;
  onAmountChange: (id: string, raw: string) => void;
  onCancelEditAmount: () => void;
  nudge: { itemId: string; aiCategory: string; aiReasoning: string } | null;
  onAcceptNudge: () => void;
  onRejectNudge: () => void;
}

export default function ExpenseReportCard({
  report,
  editingCategoryId,
  editingAmountId,
  onEditCategory,
  onCategoryChange,
  onCancelEditCategory,
  onEditAmount,
  onAmountChange,
  onCancelEditAmount,
  nudge,
  onAcceptNudge,
  onRejectNudge,
}: ExpenseReportCardProps) {
  const flaggedIds = new Set(report.flagged_items.map((f) => f.id));

  // Attention items: flagged or recategorized, EXCLUDING gap items
  const attentionItems = report.items.filter(
    (item) =>
      item.recommendation !== 'request_employee_input' &&
      (flaggedIds.has(item.id) || item.original_category !== null)
  );

  // Auto-approved: not flagged, not gap, not recategorized
  const autoApprovedItems = report.items.filter(
    (item) =>
      item.recommendation !== 'request_employee_input' &&
      !flaggedIds.has(item.id) &&
      item.original_category === null
  );

  // Gap items — synthesized from missing_items
  const gapItems: { item: ExpenseItem; gap: MissingItem }[] = report.missing_items.map((gap) => ({
    gap,
    item: {
      id: `gap-${gap.id}`,
      description: gap.detected_gap,
      vendor: 'Unknown',
      date: '',
      amount: gap.estimated_amount,
      currency: gap.currency,
      category: 'Local Transport',
      original_category: null,
      confidence: gap.confidence,
      sources: ['Gap Analysis'],
      reasoning: gap.evidence,
      policy_status: 'pending_review',
      flag_reason: 'Missing expense detected',
      recommendation: 'request_employee_input',
    },
  }));

  return (
    <div className="mt-3 space-y-3">
      {/* Attention items (flagged / recategorized) */}
      {attentionItems.map((item) => (
        <AttentionCard
          key={item.id}
          item={item}
          type="flagged"
          editingCategoryId={editingCategoryId}
          editingAmountId={editingAmountId}
          onEditCategory={onEditCategory}
          onCategoryChange={onCategoryChange}
          onCancelEditCategory={onCancelEditCategory}
          onEditAmount={onEditAmount}
          onAmountChange={onAmountChange}
          onCancelEditAmount={onCancelEditAmount}
        />
      ))}

      {/* Gap items */}
      {gapItems.map(({ item, gap }) => (
        <AttentionCard
          key={item.id}
          item={item}
          type="gap"
          gap={gap}
          editingCategoryId={editingCategoryId}
          editingAmountId={editingAmountId}
          onEditCategory={onEditCategory}
          onCategoryChange={onCategoryChange}
          onCancelEditCategory={onCancelEditCategory}
          onEditAmount={onEditAmount}
          onAmountChange={onAmountChange}
          onCancelEditAmount={onCancelEditAmount}
        />
      ))}

      {/* AI disagreement nudge */}
      {nudge && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
          <p className="text-[13px] text-blue-900">
            <strong>Ema suggests &ldquo;{nudge.aiCategory}&rdquo;</strong> &mdash; {nudge.aiReasoning}
          </p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={onRejectNudge}
              className="rounded-lg bg-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-300"
            >
              Keep Mine
            </button>
            <button
              onClick={onAcceptNudge}
              className="rounded-lg bg-[#1F8844] px-3 py-1 text-xs font-medium text-white hover:bg-[#186d36]"
            >
              Use Ema&apos;s
            </button>
          </div>
        </div>
      )}

      {/* Auto-approved summary */}
      <AutoApprovedSummary items={autoApprovedItems} />

      {/* Total bar */}
      <div className="flex items-center justify-between rounded-xl border border-gray-200/80 bg-gray-50 px-4 py-3 shadow-sm">
        <span className="text-[13px] font-semibold text-gray-700">Total</span>
        <span className="font-mono text-[15px] font-bold text-gray-900">
          ₹{report.total_amount.toLocaleString('en-IN')}
        </span>
      </div>
    </div>
  );
}
