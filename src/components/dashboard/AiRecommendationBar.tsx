'use client';

import { CheckCircle, XCircle, MessageCircle } from 'lucide-react';
import type { Recommendation } from '@/lib/utils/deriveRecommendation';

interface AiRecommendationBarProps {
  recommendation: Recommendation;
  compact?: boolean;
  onAction?: (action: 'approve' | 'reject' | 'ask') => void;
  disabled?: boolean;
}

const ACTION_ICONS = {
  approve: CheckCircle,
  reject: XCircle,
  ask: MessageCircle,
} as const;

const ACTION_STYLES = {
  approve: 'bg-[#1F8844] text-white hover:bg-[#176B36]',
  reject: 'bg-red-600 text-white hover:bg-red-700',
  ask: 'bg-amber-500 text-white hover:bg-amber-600',
} as const;

export function AiRecommendationBar({ recommendation, compact, onAction, disabled }: AiRecommendationBarProps) {
  const Icon = ACTION_ICONS[recommendation.action];

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-gray-400">Ema recommends:</span>
        <button
          onClick={() => onAction?.(recommendation.action)}
          disabled={disabled}
          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors disabled:opacity-50 ${ACTION_STYLES[recommendation.action]}`}
        >
          <Icon className="h-3 w-3" />
          {recommendation.label}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#1F8844]/20 bg-[#1F8844]/5 p-3">
      <div className="mb-1.5 flex items-center gap-1.5">
        <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#1F8844] text-[8px] font-bold text-white">
          E
        </div>
        <span className="text-xs font-medium text-[#1F8844]">Ema recommends</span>
      </div>
      <p className="mb-2.5 text-[13px] leading-relaxed text-gray-600">{recommendation.rationale}</p>
      <button
        onClick={() => onAction?.(recommendation.action)}
        disabled={disabled}
        className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${ACTION_STYLES[recommendation.action]}`}
      >
        <Icon className="h-3.5 w-3.5" />
        {recommendation.label}
      </button>
    </div>
  );
}
