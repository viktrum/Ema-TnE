'use client';

import { CheckCircle, XCircle, MessageCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { deriveRecommendation } from '@/lib/utils/deriveRecommendation';

interface FlaggedItem {
  id: number;
  traveler_name: string;
  destination: string;
  dates: string;
  total_amount: number;
  currency: string;
  avg_confidence: number;
  flag_reason: string;
  flag_severity: 'LOW' | 'MEDIUM' | 'HIGH';
  reasoning?: unknown;
  sources?: string[];
}

interface FlaggedCardReviewProps {
  item: FlaggedItem;
  isExpanded: boolean;
  onToggle: () => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onAsk: (id: number) => void;
  disabled?: boolean;
}

function normalizeReasoning(reasoning: unknown): string {
  if (!reasoning) return '';
  if (typeof reasoning === 'string') return reasoning;
  if (typeof reasoning === 'object' && reasoning !== null) {
    const r = reasoning as { summary?: string; ai_reasoning?: string };
    return r.summary || r.ai_reasoning || '';
  }
  return '';
}

function ReasoningBullets({ text }: { text: string }) {
  const sentences = text
    .split(/\.(?=\s+[A-Z])/)
    .map((s) => s.trim().replace(/\.$/, ''))
    .filter((s) => s.length > 10);

  if (sentences.length <= 1) {
    return <p className="text-xs leading-relaxed text-gray-500">{text}</p>;
  }

  return (
    <ul className="space-y-1 text-xs leading-relaxed text-gray-500">
      {sentences.map((sentence, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gray-300" />
          <span>{sentence}.</span>
        </li>
      ))}
    </ul>
  );
}

const ACTION_STYLES = {
  approve: 'bg-[#1F8844] text-white hover:bg-[#176B36] ring-[#1F8844]/20',
  reject: 'bg-red-600 text-white hover:bg-red-700 ring-red-600/20',
  ask: 'bg-amber-500 text-white hover:bg-amber-600 ring-amber-500/20',
} as const;

const ACTION_ICONS = { approve: CheckCircle, reject: XCircle, ask: MessageCircle } as const;

export function FlaggedCardReview({
  item,
  isExpanded,
  onToggle,
  onApprove,
  onReject,
  onAsk,
  disabled,
}: FlaggedCardReviewProps) {
  const recommendation = deriveRecommendation(item.flag_reason);
  const reasoning = normalizeReasoning(item.reasoning);
  const sources = item.sources || [];
  const RecommendedIcon = ACTION_ICONS[recommendation.action];
  const currencySymbol = item.currency === 'GBP' ? '£' : '₹';

  const handleAction = (action: 'approve' | 'reject' | 'ask') => {
    if (action === 'approve') onApprove(item.id);
    else if (action === 'reject') onReject(item.id);
    else onAsk(item.id);
  };

  return (
    <div className={`rounded-xl border bg-white transition-shadow ${
      isExpanded ? 'shadow-md border-gray-300' : 'shadow-sm border-gray-200 hover:shadow-md'
    }`}>
      {/* Compact header row */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
        className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left"
      >
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
        <span className="text-sm font-medium text-gray-800 truncate flex-1">{item.traveler_name}</span>
        <span className="text-xs text-gray-500 truncate max-w-[200px]">{item.flag_reason}</span>
        <span className="shrink-0 text-xs font-mono font-semibold text-gray-700">
          {currencySymbol}{item.total_amount?.toLocaleString('en-IN')}
        </span>

        {/* Inline recommended action — stops propagation */}
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
        <div onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => handleAction(recommendation.action)}
            disabled={disabled}
            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-medium ring-1 transition-all disabled:opacity-50 ${ACTION_STYLES[recommendation.action]}`}
          >
            <RecommendedIcon className="h-3 w-3" />
            {recommendation.label}
          </button>
        </div>

        {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
      </div>

      {/* Expanded detail — lightweight, matches Tier 1 philosophy */}
      {isExpanded && (
        <div className="border-t border-gray-100 px-4 pb-3 pt-3 space-y-2.5">
          {/* Context line */}
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>{item.destination}</span>
            <span>·</span>
            <span>{item.dates}</span>
            <span>·</span>
            <span>{item.avg_confidence}% confidence</span>
            {sources.length > 0 && (
              <>
                <span>·</span>
                <span>{sources.length} source{sources.length !== 1 ? 's' : ''} verified</span>
              </>
            )}
          </div>

          {/* Ema's take — same pattern as Tier 1 */}
          <div className="flex items-center gap-2">
            <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#1F8844] text-[7px] font-bold text-white">
              E
            </div>
            <p className="text-xs text-gray-500">{recommendation.rationale}</p>
          </div>

          {/* AI Reasoning — bullets for scannability */}
          {reasoning && (
            <div className="pl-6">
              <ReasoningBullets text={reasoning} />
            </div>
          )}

          {/* Single action zone — same pattern as Tier 1 */}
          <div className="flex items-center gap-2 pt-0.5">
            <button
              onClick={() => handleAction(recommendation.action)}
              disabled={disabled}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium ring-1 transition-all disabled:opacity-50 ${ACTION_STYLES[recommendation.action]}`}
            >
              <RecommendedIcon className="h-3.5 w-3.5" />
              {recommendation.label}
            </button>

            <span className="h-4 w-px bg-gray-200" />

            {/* Secondary actions — muted text */}
            {recommendation.action !== 'approve' && (
              <button
                onClick={() => onApprove(item.id)}
                disabled={disabled}
                className="rounded px-2 py-1 text-xs text-gray-400 hover:text-[#1F8844] hover:bg-green-50 disabled:opacity-50"
              >
                Approve
              </button>
            )}
            {recommendation.action !== 'reject' && (
              <button
                onClick={() => onReject(item.id)}
                disabled={disabled}
                className="rounded px-2 py-1 text-xs text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Reject
              </button>
            )}
            {recommendation.action !== 'ask' && (
              <button
                onClick={() => onAsk(item.id)}
                disabled={disabled}
                className="rounded px-2 py-1 text-xs text-gray-400 hover:text-amber-600 hover:bg-amber-50 disabled:opacity-50"
              >
                Ask Employee
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
