'use client';

import { useState } from 'react';
import { getBrand } from '@/lib/utils/sourceBranding';
import { EXPENSE_CATEGORIES } from '@/lib/constants/categories';

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

interface AttentionCardProps {
  item: ExpenseItem;
  type: 'flagged' | 'gap';
  gap?: MissingItem;
  editingCategoryId: string | null;
  editingAmountId: string | null;
  onEditCategory: (id: string) => void;
  onCategoryChange: (id: string, current: string, next: string) => void;
  onCancelEditCategory: () => void;
  onEditAmount: (id: string) => void;
  onAmountChange: (id: string, raw: string) => void;
  onCancelEditAmount: () => void;
}

// Source keywords for evidence attribution
const SOURCE_KEYWORDS: { keyword: RegExp; source: string }[] = [
  { keyword: /calendar|meeting|schedule|event/i, source: 'Calendar' },
  { keyword: /CRM|salesforce|client|deal|pipeline|opportunity/i, source: 'CRM' },
  { keyword: /policy|limit|exceed|per-diem|allowance|complian/i, source: 'Policy' },
  { keyword: /pattern|analytics|historical|usual|average|typical/i, source: 'Pattern Analysis' },
  { keyword: /receipt|scan|OCR/i, source: 'Receipt Scanner' },
  { keyword: /card|transaction|payment|charge/i, source: 'Card' },
  { keyword: /email|gmail|mail/i, source: 'Email' },
  { keyword: /slack|message|channel/i, source: 'Slack' },
  { keyword: /booking|flight|hotel|trip/i, source: 'Booking System' },
];

function formatReasoning(reasoning: string | Record<string, unknown>): string {
  if (typeof reasoning === 'string') return reasoning;
  if (reasoning && typeof reasoning === 'object') {
    // Handle {summary, ai_reasoning} shape
    const r = reasoning as { summary?: string; ai_reasoning?: string };
    return r.ai_reasoning || r.summary || JSON.stringify(reasoning);
  }
  return String(reasoning || '');
}

function parseEvidence(reasoning: string | Record<string, unknown>): { source: string; text: string }[] {
  const text = formatReasoning(reasoning);
  if (!text) return [];

  // Split on sentence boundaries: ". " followed by uppercase letter
  const sentences = text.split(/\.\s+(?=[A-Z])/).map((s) => s.replace(/\.$/, '').trim()).filter(Boolean);

  return sentences.map((sentence) => {
    for (const { keyword, source } of SOURCE_KEYWORDS) {
      if (keyword.test(sentence)) {
        return { source, text: sentence };
      }
    }
    return { source: 'Policy', text: sentence };
  });
}

export default function AttentionCard({
  item,
  type,
  gap,
  editingCategoryId,
  editingAmountId,
  onEditCategory,
  onCategoryChange,
  onCancelEditCategory,
  onEditAmount,
  onAmountChange,
  onCancelEditAmount,
}: AttentionCardProps) {
  const [expanded, setExpanded] = useState(true);
  const isGap = type === 'gap';
  const borderColor = isGap ? 'border-l-[#EAB308]' : 'border-l-[#F59E0B]';
  const bgColor = isGap ? 'bg-[#FEFCE8]' : 'bg-[#FFFBEB]';

  const evidence = parseEvidence(item.reasoning);
  const confidenceColor =
    item.confidence > 90 ? 'bg-green-500' : item.confidence >= 70 ? 'bg-amber-500' : 'bg-red-500';

  const title = isGap ? (gap?.detected_gap || 'Missing transport expense') : item.description;

  return (
    <div
      className={`animate-in fade-in slide-in-from-left-2 duration-300 rounded-xl border border-gray-200/80 border-l-[3px] ${borderColor} ${bgColor} p-4 shadow-sm`}
    >
      {/* Top section */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {isGap && (
            <span className="mb-1 inline-block rounded bg-yellow-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-yellow-800">
              Missing Expense
            </span>
          )}
          <p className="text-[13px] font-semibold text-gray-900">{title}</p>
          <p className="mt-0.5 text-[11px] text-gray-500">{item.date}</p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {/* Category pill (editable) */}
          {editingCategoryId === item.id ? (
            <select
              autoFocus
              defaultValue={item.category}
              onChange={(e) => onCategoryChange(item.id, item.category, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') onCancelEditCategory();
              }}
              onBlur={() => onCancelEditCategory()}
              className="rounded-full border border-gray-300 px-2 py-0.5 text-[11px]"
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
              {!EXPENSE_CATEGORIES.includes(item.category as (typeof EXPENSE_CATEGORIES)[number]) && (
                <option value={item.category}>{item.category}</option>
              )}
            </select>
          ) : (
            <button
              onClick={() => onEditCategory(item.id)}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition hover:ring-1 hover:ring-gray-300 ${
                item.original_category ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}
              title="Click to change category"
            >
              {item.category}
            </button>
          )}

          {/* Amount (editable) */}
          {editingAmountId === item.id ? (
            <input
              type="number"
              autoFocus
              defaultValue={item.amount}
              onBlur={() => onCancelEditAmount()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onAmountChange(item.id, (e.target as HTMLInputElement).value);
                }
                if (e.key === 'Escape') onCancelEditAmount();
              }}
              className="w-24 rounded border border-gray-300 px-2 py-0.5 text-right text-[12px] font-mono"
            />
          ) : (
            <button
              onClick={() => onEditAmount(item.id)}
              className="font-mono text-[13px] font-semibold text-gray-900 hover:underline"
              title="Click to edit"
            >
              ₹{item.amount.toLocaleString('en-IN')}
            </button>
          )}

          {/* Confidence dot */}
          <span className={`h-2 w-2 shrink-0 rounded-full ${confidenceColor}`} title={`${item.confidence}% confidence`} />
        </div>
      </div>

      {/* Original category badge */}
      {item.original_category && (
        <span className="mt-1 inline-block rounded bg-amber-200/60 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
          {item.original_category} → {item.category}
        </span>
      )}

      {/* Evidence section — source-attributed */}
      {evidence.length > 0 && expanded && (
        <div className="mt-3 space-y-2">
          {evidence.map((ev, i) => {
            const brand = getBrand(ev.source);
            return (
              <div key={i} className="flex items-start gap-2.5">
                <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded ${brand.bg}`}>
                  <span className={`h-2 w-2 rounded-full ${brand.dotColor}`} />
                </div>
                <div className="min-w-0">
                  <p className={`text-[10px] font-semibold uppercase tracking-wide ${brand.color}`}>
                    {brand.label}
                  </p>
                  <p className="text-[12px] leading-relaxed text-gray-700">{ev.text}.</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Toggle evidence */}
      {evidence.length > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-[11px] text-gray-400 underline decoration-dotted hover:text-gray-600"
        >
          {expanded ? 'Hide evidence' : 'Show evidence'}
        </button>
      )}

      {/* Gap-specific action needed */}
      {isGap && gap && (
        <p className="mt-2 text-[12px] text-amber-800">
          Estimated ~₹{gap.estimated_amount.toLocaleString('en-IN')} &mdash; {gap.action_needed}
        </p>
      )}
    </div>
  );
}
