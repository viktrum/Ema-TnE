/**
 * Deterministic recommendation derivation from flag_reason text.
 * No LLM call — regex-based pattern matching on known flag types.
 */

export interface Recommendation {
  action: 'approve' | 'reject' | 'ask';
  label: string;
  rationale: string;
}

interface PatternRule {
  pattern: RegExp;
  recommendation: Recommendation;
}

const PATTERN_RULES: PatternRule[] = [
  // Higher-priority: Slack/pre-approval overrides should come first
  {
    pattern: /pre-approved via slack|slack.*pre-approv/i,
    recommendation: {
      action: 'ask',
      label: 'Verify Slack Approval',
      rationale: 'VP pre-approved via Slack — verify and formalize before approving.',
    },
  },
  {
    pattern: /re-categori[sz]/i,
    recommendation: {
      action: 'approve',
      label: 'Approve Re-categorization',
      rationale: 'Re-categorization is supported by calendar and CRM data.',
    },
  },
  {
    pattern: /cross-employee duplicate/i,
    recommendation: {
      action: 'reject',
      label: 'Reject Duplicate Claim',
      rationale: 'Same expense claimed by multiple employees from the same event.',
    },
  },
  {
    pattern: /duplicate.*charge|appears twice/i,
    recommendation: {
      action: 'reject',
      label: 'Reject Duplicate',
      rationale: 'Transaction appears duplicated within the same timeframe.',
    },
  },
  {
    pattern: /phantom.*client|all.*attendees.*internal/i,
    recommendation: {
      action: 'approve',
      label: 'Approve as Internal Meal',
      rationale: 'All attendees verified as internal — re-classification is correct.',
    },
  },
  {
    pattern: /missing receipt/i,
    recommendation: {
      action: 'ask',
      label: 'Request Receipt',
      rationale: 'High-value expense requires receipt for compliance.',
    },
  },
  {
    pattern: /unauthorized.*upgrade|not eligible/i,
    recommendation: {
      action: 'reject',
      label: 'Reject Upgrade',
      rationale: 'Employee grade does not qualify for this class of travel.',
    },
  },
  {
    pattern: /weekend.*hotel|no.*business purpose/i,
    recommendation: {
      action: 'ask',
      label: 'Request Justification',
      rationale: 'No business purpose found for weekend stay.',
    },
  },
  {
    pattern: /missing pre-approval|without pre-approval/i,
    recommendation: {
      action: 'ask',
      label: 'Request Pre-Approval',
      rationale: 'Team events require pre-approval per company policy.',
    },
  },
  {
    pattern: /date mismatch|does not match/i,
    recommendation: {
      action: 'ask',
      label: 'Clarify Date Discrepancy',
      rationale: 'Receipt date does not align with trip dates.',
    },
  },
  {
    pattern: /currency.*discrepancy|conversion rate/i,
    recommendation: {
      action: 'ask',
      label: 'Review Conversion Rates',
      rationale: 'Exchange rate variance exceeds normal thresholds.',
    },
  },
  {
    pattern: /same.restaurant.*pattern/i,
    recommendation: {
      action: 'approve',
      label: 'Approve — Pattern Noted',
      rationale: 'Repeat visits flagged for visibility but within policy limits.',
    },
  },
  {
    pattern: /conference.*meal.*overlap|per diem.*conference/i,
    recommendation: {
      action: 'ask',
      label: 'Clarify Meal Coverage',
      rationale: 'Conference agenda shows meals provided on some days.',
    },
  },
];

const DEFAULT_RECOMMENDATION: Recommendation = {
  action: 'ask',
  label: 'Request Details',
  rationale: 'Flag requires additional context to make a decision.',
};

export function deriveRecommendation(flagReason: string): Recommendation {
  for (const rule of PATTERN_RULES) {
    if (rule.pattern.test(flagReason)) {
      return rule.recommendation;
    }
  }
  return DEFAULT_RECOMMENDATION;
}
