'use client';

import { ArrowDown } from 'lucide-react';

interface EmaBriefingBarProps {
  decisionCount: number;
  reviewCount: number;
  autoHandledCount: number;
  autoApprovedCount: number;
  totalCount: number;
  userName: string;
}

export function EmaBriefingBar({
  decisionCount,
  reviewCount,
  autoHandledCount,
  autoApprovedCount,
  totalCount,
  userName,
}: EmaBriefingBarProps) {
  const firstName = userName.split(' ')[0] || 'there';
  const needsAttention = decisionCount + reviewCount;
  const estimatedMinutes = decisionCount * 3 + reviewCount * 1;

  const mainText = needsAttention === 0
    ? `${firstName}, you're all caught up. No items need your review.`
    : `${firstName}, ${decisionCount > 0 ? `${decisionCount} item${decisionCount !== 1 ? 's' : ''} need${decisionCount === 1 ? 's' : ''} your call` : ''}${
        decisionCount > 0 && reviewCount > 0 ? '. ' : ''
      }${reviewCount > 0 ? `${reviewCount} ${decisionCount > 0 ? 'are' : 'item' + (reviewCount !== 1 ? 's are' : ' is')} straightforward — I've marked my recommendation` : ''}.`;

  return (
    <div className="rounded-xl border border-[#1F8844]/20 bg-[#1F8844]/5 px-5 py-4">
      <div className="flex items-start gap-3">
        {/* Ema avatar */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1F8844] text-xs font-bold text-white">
          E
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm leading-relaxed text-gray-700">
            {mainText}
            {estimatedMinutes > 0 && (
              <span className="text-gray-400"> Estimated review time: {estimatedMinutes} minutes.</span>
            )}
          </p>

          {/* Secondary context line */}
          <p className="mt-1 text-xs text-gray-400">
            {autoApprovedCount} auto-approved · {totalCount} total this month
            {autoHandledCount > 0 && ` · ${autoHandledCount} auto-handled for transparency`}
          </p>
        </div>

        {/* Jump to urgent */}
        {decisionCount > 0 && (
          <button
            onClick={() => {
              document.getElementById('tier-decision')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="shrink-0 flex items-center gap-1 rounded-lg bg-[#1F8844] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#176B36]"
          >
            Jump to urgent
            <ArrowDown className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
