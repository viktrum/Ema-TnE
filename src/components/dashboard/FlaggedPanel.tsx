'use client';

import { CheckCircle } from 'lucide-react';
import { groupFlaggedItems, type Tier } from '@/lib/utils/classifyFlaggedItems';
import { TierSection } from './TierSection';
import { FlaggedCardDecision } from './FlaggedCardDecision';
import { FlaggedCardReview } from './FlaggedCardReview';
import { FlaggedCardAutoHandled } from './FlaggedCardAutoHandled';

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
  reasoning?: unknown;
  sources?: string[];
  scenario_id?: string;
}

interface FlaggedPanelProps {
  items: FlaggedItem[];
  expandedFlagIds: Set<number>;
  onToggleExpand: (id: number) => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onAsk: (id: number) => void;
  animatingApprovalId: number | null;
  animationPhase: 'flash' | 'overlay' | 'collapsing' | null;
  disabled?: boolean;
  readOnly?: boolean;
}

export function FlaggedPanel({
  items,
  expandedFlagIds,
  onToggleExpand,
  onApprove,
  onReject,
  onAsk,
  animatingApprovalId,
  animationPhase,
  disabled,
  readOnly,
}: FlaggedPanelProps) {
  const tierGroups = groupFlaggedItems(items);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <CheckCircle className="mb-3 h-10 w-10 text-green-400" />
        <p className="text-sm font-medium">All clear. No items need your review.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tierGroups.map((group) => (
        <TierSection
          key={group.tier}
          tier={group.tier}
          label={group.label}
          count={group.items.length}
          defaultExpanded={group.tier !== 'auto-handled'}
        >
          {group.tier === 'decision' && !readOnly && (
            <>
              {group.items.map((item) => (
                <FlaggedCardDecision
                  key={item.id}
                  item={item}
                  animationPhase={animatingApprovalId === item.id ? animationPhase : null}
                  isAnimating={animatingApprovalId === item.id}
                  onApprove={onApprove}
                  onReject={onReject}
                  onAsk={onAsk}
                  disabled={disabled}
                />
              ))}
            </>
          )}

          {group.tier === 'review' && !readOnly && (
            <>
              {group.items.map((item) => (
                <FlaggedCardReview
                  key={item.id}
                  item={item}
                  isExpanded={expandedFlagIds.has(item.id)}
                  onToggle={() => onToggleExpand(item.id)}
                  onApprove={onApprove}
                  onReject={onReject}
                  onAsk={onAsk}
                  disabled={disabled}
                />
              ))}
            </>
          )}

          {group.tier === 'auto-handled' && (
            <>
              {group.items.map((item) => (
                <FlaggedCardAutoHandled key={item.id} item={item} />
              ))}
            </>
          )}

          {/* Read-only mode (admin view) — show all tiers as read-only cards */}
          {readOnly && group.tier !== 'auto-handled' && (
            <>
              {group.items.map((item) => (
                <FlaggedCardReview
                  key={item.id}
                  item={item}
                  isExpanded={expandedFlagIds.has(item.id)}
                  onToggle={() => onToggleExpand(item.id)}
                  onApprove={() => {}}
                  onReject={() => {}}
                  onAsk={() => {}}
                  disabled={true}
                />
              ))}
            </>
          )}
        </TierSection>
      ))}
    </div>
  );
}
