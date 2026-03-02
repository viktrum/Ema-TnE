/**
 * Tier classification for flagged dashboard items.
 * Groups by cognitive demand: decision (needs human call) → review (quick) → auto-handled.
 *
 * PA-reviewed logic:
 *   - HIGH severity → always decision
 *   - MEDIUM severity + low confidence (<75) → decision
 *   - LOW severity + high confidence (>=80) → auto-handled
 *   - Everything else → review
 *   - LOW severity items never land in "decision" regardless of confidence
 */

export type Tier = 'decision' | 'review' | 'auto-handled';

export interface TierGroup<T> {
  tier: Tier;
  label: string;
  items: T[];
}

interface Classifiable {
  flag_severity: 'LOW' | 'MEDIUM' | 'HIGH';
  avg_confidence: number;
}

export function classifyFlaggedItem(item: Classifiable): Tier {
  const { flag_severity, avg_confidence } = item;

  if (flag_severity === 'HIGH') return 'decision';
  if (flag_severity === 'MEDIUM' && avg_confidence < 75) return 'decision';
  if (flag_severity === 'LOW' && avg_confidence >= 80) return 'auto-handled';
  return 'review';
}

const TIER_LABELS: Record<Tier, string> = {
  decision: 'Needs Your Call',
  review: 'Quick Review',
  'auto-handled': 'Auto-Handled',
};

const TIER_ORDER: Tier[] = ['decision', 'review', 'auto-handled'];

export function groupFlaggedItems<T extends Classifiable>(items: T[]): TierGroup<T>[] {
  const groups: Record<Tier, T[]> = {
    decision: [],
    review: [],
    'auto-handled': [],
  };

  for (const item of items) {
    groups[classifyFlaggedItem(item)].push(item);
  }

  return TIER_ORDER
    .filter((tier) => groups[tier].length > 0)
    .map((tier) => ({
      tier,
      label: TIER_LABELS[tier],
      items: groups[tier],
    }));
}
