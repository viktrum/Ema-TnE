'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, MessageCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { SourceCardGrid } from './SourceCardGrid';
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

interface FlaggedCardDecisionProps {
  item: FlaggedItem;
  animationPhase: 'flash' | 'overlay' | 'collapsing' | null;
  isAnimating: boolean;
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

/** Split reasoning paragraph into bullet points. Splits on sentence boundaries. */
function ReasoningBullets({ text }: { text: string }) {
  // Split on ". " followed by uppercase letter (sentence boundary), keep the period
  const sentences = text
    .split(/\.(?=\s+[A-Z])/)
    .map((s) => s.trim().replace(/\.$/, ''))
    .filter((s) => s.length > 10);

  if (sentences.length <= 1) {
    return <p className="text-[13px] leading-relaxed text-gray-700">{text}</p>;
  }

  return (
    <ul className="space-y-1.5 text-[13px] leading-relaxed text-gray-700">
      {sentences.map((sentence, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
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

export function FlaggedCardDecision({
  item,
  animationPhase,
  isAnimating,
  onApprove,
  onReject,
  onAsk,
  disabled,
}: FlaggedCardDecisionProps) {
  const [showDetails, setShowDetails] = useState(false);
  const recommendation = deriveRecommendation(item.flag_reason);
  const reasoning = normalizeReasoning(item.reasoning);
  const sources = item.sources || [];
  const severity = item.flag_severity;
  const RecommendedIcon = ACTION_ICONS[recommendation.action];
  const currencySymbol = item.currency === 'GBP' ? '£' : '₹';

  const handleAction = (action: 'approve' | 'reject' | 'ask') => {
    if (action === 'approve') onApprove(item.id);
    else if (action === 'reject') onReject(item.id);
    else onAsk(item.id);
  };

  return (
    <div
      className={`relative overflow-hidden rounded-xl border bg-white transition-all duration-300 ${
        isAnimating && animationPhase === 'flash'
          ? 'ring-2 ring-green-400 shadow-lg shadow-green-100'
          : isAnimating && animationPhase === 'collapsing'
            ? 'max-h-0 opacity-0 border-0 my-0 py-0'
            : 'border-gray-200 shadow-sm'
      }`}
    >
      {/* Approve overlay */}
      {isAnimating && animationPhase === 'overlay' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-green-50/95">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm font-medium">Approved · Employee notified</span>
          </div>
        </div>
      )}

      {/* === Layer 1: Identity + Amount (always visible) === */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-start gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            severity === 'HIGH' ? 'bg-red-100' : 'bg-amber-100'
          }`}>
            <AlertTriangle className={`h-4 w-4 ${
              severity === 'HIGH' ? 'text-red-600' : 'text-amber-600'
            }`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-800">{item.traveler_name}</span>
              <span className="text-xs text-gray-400">{item.destination} · {item.dates}</span>
            </div>
            <p className="mt-1 text-[13px] leading-snug text-gray-600">{item.flag_reason}</p>
          </div>

          <span className="shrink-0 text-base font-mono font-semibold text-gray-800">
            {currencySymbol}{item.total_amount?.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* === Layer 2: Ema's take + Actions (single zone) === */}
      <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-3">
        <div className="flex items-center gap-3">
          {/* Ema avatar + rationale — compact one-liner */}
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1F8844] text-[8px] font-bold text-white">
            E
          </div>
          <p className="flex-1 text-xs text-gray-500">
            {recommendation.rationale}
          </p>

          {/* Source count as context */}
          {sources.length > 0 && (
            <span className="shrink-0 text-[10px] text-gray-400">
              {sources.length} source{sources.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Single action zone: recommended action is primary, others are secondary */}
        <div className="mt-2.5 flex items-center gap-2">
          <button
            onClick={() => handleAction(recommendation.action)}
            disabled={disabled || isAnimating}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium ring-1 transition-all disabled:opacity-50 ${ACTION_STYLES[recommendation.action]}`}
          >
            <RecommendedIcon className="h-3.5 w-3.5" />
            {recommendation.label}
          </button>

          <span className="h-4 w-px bg-gray-200" />

          {/* Secondary actions — muted, text-only */}
          {recommendation.action !== 'approve' && (
            <button
              onClick={() => onApprove(item.id)}
              disabled={disabled || isAnimating}
              className="rounded px-2 py-1 text-xs text-gray-400 hover:text-[#1F8844] hover:bg-green-50 disabled:opacity-50"
            >
              Approve
            </button>
          )}
          {recommendation.action !== 'reject' && (
            <button
              onClick={() => onReject(item.id)}
              disabled={disabled || isAnimating}
              className="rounded px-2 py-1 text-xs text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Reject
            </button>
          )}
          {recommendation.action !== 'ask' && (
            <button
              onClick={() => onAsk(item.id)}
              disabled={disabled || isAnimating}
              className="rounded px-2 py-1 text-xs text-gray-400 hover:text-amber-600 hover:bg-amber-50 disabled:opacity-50"
            >
              Ask Employee
            </button>
          )}
        </div>
      </div>

      {/* === Layer 3: Details (progressive disclosure) === */}
      <div className="border-t border-gray-100">
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="flex w-full items-center justify-center gap-1.5 py-2 text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
        >
          {showDetails ? 'Hide' : 'Show'} reasoning & sources
          {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        {showDetails && (
          <div className="px-5 pb-4 space-y-3">
            {/* AI Reasoning — bullet points for scannability */}
            {reasoning && (
              <div className="rounded-lg bg-gray-50 p-3">
                <ReasoningBullets text={reasoning} />
              </div>
            )}

            {/* Source cards */}
            {sources.length > 0 && <SourceCardGrid sources={sources} />}

            {/* Confidence */}
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="h-1.5 w-16 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#1F8844]"
                  style={{ width: `${item.avg_confidence}%` }}
                />
              </div>
              <span>{item.avg_confidence}% confidence</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
