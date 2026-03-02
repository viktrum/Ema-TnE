'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { Tier } from '@/lib/utils/classifyFlaggedItems';

interface TierSectionProps {
  tier: Tier;
  label: string;
  count: number;
  children: ReactNode;
  defaultExpanded?: boolean;
}

const TIER_ACCENTS: Record<Tier, { border: string; badge: string; text: string }> = {
  decision: {
    border: 'border-l-red-500',
    badge: 'bg-red-100 text-red-700',
    text: 'text-red-700',
  },
  review: {
    border: 'border-l-amber-500',
    badge: 'bg-amber-100 text-amber-700',
    text: 'text-amber-700',
  },
  'auto-handled': {
    border: 'border-l-green-500',
    badge: 'bg-green-100 text-green-700',
    text: 'text-green-700',
  },
};

export function TierSection({ tier, label, count, children, defaultExpanded = true }: TierSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const accent = TIER_ACCENTS[tier];

  return (
    <section
      id={`tier-${tier}`}
      role="region"
      aria-label={`${label} — ${count} items`}
    >
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        className={`mb-2 flex w-full items-center gap-3 rounded-lg border-l-4 bg-white px-4 py-2.5 text-left transition-colors hover:bg-gray-50 ${accent.border}`}
      >
        <span className={`text-sm font-semibold ${accent.text}`}>{label}</span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${accent.badge}`}>
          {count}
        </span>
        <span className="flex-1" />
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-3 pb-4">
          {children}
        </div>
      )}
    </section>
  );
}
