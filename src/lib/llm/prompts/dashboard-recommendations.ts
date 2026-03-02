/**
 * Dashboard AI recommendations — prompt builder, response parser, label formatter.
 *
 * LLM produces: source-attributed findings, importance score, action, rationale.
 * Code handles: validation, label formatting, fallback.
 */

import { z } from 'zod/v4';
import type { Recommendation } from '@/lib/utils/deriveRecommendation';

// --- Types ---

interface DashboardItem {
  id: number;
  flag_reason: string;
  flag_severity: string;
  total_amount: number;
  currency: string;
  sources?: string[] | string | null;
  reasoning?: unknown;
}

export interface SourceFinding {
  source: string;
  finding: string;
}

export interface AiRecommendation extends Recommendation {
  sourceFindings: SourceFinding[];
  importance: number;
}

// --- Zod schema for LLM response validation ---

const SourceFindingSchema = z.object({
  source: z.string(),
  finding: z.string(),
});

const LLMRecommendationItemSchema = z.object({
  id: z.number(),
  action: z.enum(['approve', 'reject', 'ask']),
  rationale: z.string(),
  source_findings: z.array(SourceFindingSchema),
  importance: z.number().min(1).max(10),
});

const LLMRecommendationArraySchema = z.array(LLMRecommendationItemSchema);

// --- Prompt builder ---

const SYSTEM_PROMPT = `You analyze flagged expense reports and recommend actions.

For each item you receive:
- id, flag_reason, severity (LOW/MEDIUM/HIGH)
- amount + currency
- sources consulted (e.g., Policy, Slack, Calendar, CRM)
- reasoning summary from initial analysis

For each item, output:
- source_findings: array of { "source": "<tool name>", "finding": "<what this source revealed>" }
  Use the EXACT source names from the input (e.g., "Policy", "Slack", "CRM", "Calendar", "HRMS", "Booking System", "Pre-Approval System", "Email", "Card", "Receipt Scanner", "Uber Receipt", "Pattern Analysis", "Gap Analysis", "Conference Agenda", "Currency Exchange", "RBI Reference Rates", "HR Org Chart", "Transaction History", "Payment Gateway").
  Each finding should be one concise sentence about what that specific source contributed.
  List findings in order of importance to the decision.
- importance: 1-10 score for how much human judgment is needed (10 = conflicting signals requiring manager decision, 1 = clear-cut)
- action: "approve" | "reject" | "ask"
- rationale: one SHORT sentence (max 15 words) summarizing the recommendation. Be direct, not verbose.

Decision rules:
- approve: expense is legitimate, evidence supports it
- reject: clear policy violation with NO mitigating evidence
- ask: conflicting signals OR missing info (e.g., policy violation BUT Slack pre-approval exists → ask to verify)

Items with conflicting evidence across sources (e.g., policy says reject but Slack shows pre-approval) should get importance 8-10.
Simple violations (duplicate charges, missing receipts) should get importance 3-5.

Output ONLY a JSON array: [{ "id": <number>, "source_findings": [...], "importance": <number>, "action": "...", "rationale": "..." }]`;

function normalizeReasoningText(reasoning: unknown): string {
  if (!reasoning) return '';
  if (typeof reasoning === 'string') return reasoning;
  if (typeof reasoning === 'object' && reasoning !== null) {
    const r = reasoning as { summary?: string; ai_reasoning?: string };
    return r.summary || r.ai_reasoning || '';
  }
  return '';
}

function normalizeSources(sources: string[] | string | null | undefined): string[] {
  if (!sources) return [];
  if (typeof sources === 'string') {
    try { return JSON.parse(sources); } catch { return []; }
  }
  return sources;
}

export function buildRecommendationPrompt(items: DashboardItem[]): { system: string; user: string } {
  const itemBlocks = items.map((item) => {
    const sources = normalizeSources(item.sources);
    const reasoning = normalizeReasoningText(item.reasoning);
    const currencySymbol = item.currency === 'GBP' ? '£' : '₹';

    return [
      `[Item ${item.id}]`,
      `Flag: ${item.flag_reason}`,
      `Severity: ${item.flag_severity}`,
      `Amount: ${currencySymbol}${item.total_amount?.toLocaleString('en-IN')}`,
      sources.length > 0 ? `Sources: ${sources.join(', ')}` : null,
      reasoning ? `Reasoning: ${reasoning}` : null,
    ].filter(Boolean).join('\n');
  });

  return {
    system: SYSTEM_PROMPT,
    user: itemBlocks.join('\n\n'),
  };
}

// --- Response parser ---

export function parseRecommendationResponse(
  cleaned: string
): Array<{
  id: number;
  action: 'approve' | 'reject' | 'ask';
  rationale: string;
  source_findings: SourceFinding[];
  importance: number;
}> {
  const parsed = JSON.parse(cleaned);
  return LLMRecommendationArraySchema.parse(parsed);
}

// --- Button label formatter (deterministic — no LLM) ---

const LABEL_MAP: Array<{ pattern: RegExp; labels: Record<string, string> }> = [
  {
    pattern: /slack.*pre-approv|pre-approved via slack/i,
    labels: { approve: 'Approve with Slack Evidence', reject: 'Reject Despite Pre-Approval', ask: 'Verify Slack Approval' },
  },
  {
    pattern: /re-categori[sz]/i,
    labels: { approve: 'Approve Re-categorization', reject: 'Reject Re-categorization', ask: 'Clarify Category' },
  },
  {
    pattern: /cross-employee duplicate/i,
    labels: { approve: 'Approve Claim', reject: 'Reject Duplicate Claim', ask: 'Verify Duplicate' },
  },
  {
    pattern: /duplicate.*charge|appears twice/i,
    labels: { approve: 'Approve Charge', reject: 'Reject Duplicate', ask: 'Verify Duplicate' },
  },
  {
    pattern: /phantom.*client|all.*attendees.*internal/i,
    labels: { approve: 'Approve as Internal Meal', reject: 'Reject Claim', ask: 'Verify Attendees' },
  },
  {
    pattern: /missing receipt/i,
    labels: { approve: 'Approve Without Receipt', reject: 'Reject — No Receipt', ask: 'Request Receipt' },
  },
  {
    pattern: /unauthorized.*upgrade|not eligible/i,
    labels: { approve: 'Approve Upgrade', reject: 'Reject Upgrade', ask: 'Verify Upgrade' },
  },
  {
    pattern: /weekend.*hotel|no.*business purpose/i,
    labels: { approve: 'Approve Stay', reject: 'Reject Stay', ask: 'Request Justification' },
  },
  {
    pattern: /missing pre-approval|without pre-approval/i,
    labels: { approve: 'Approve Without Pre-Approval', reject: 'Reject — No Pre-Approval', ask: 'Request Pre-Approval' },
  },
  {
    pattern: /date mismatch|does not match/i,
    labels: { approve: 'Approve Dates', reject: 'Reject — Date Mismatch', ask: 'Clarify Date Discrepancy' },
  },
  {
    pattern: /currency.*discrepancy|conversion rate/i,
    labels: { approve: 'Approve Conversion', reject: 'Reject — Rate Issue', ask: 'Review Conversion Rates' },
  },
  {
    pattern: /same.restaurant.*pattern/i,
    labels: { approve: 'Approve — Pattern Noted', reject: 'Reject Pattern', ask: 'Verify Pattern' },
  },
  {
    pattern: /conference.*meal.*overlap|per diem.*conference/i,
    labels: { approve: 'Approve Meal', reject: 'Reject — Meals Provided', ask: 'Clarify Meal Coverage' },
  },
];

const DEFAULT_LABELS: Record<string, string> = {
  approve: 'Approve',
  reject: 'Reject',
  ask: 'Request Details',
};

export function formatButtonLabel(action: 'approve' | 'reject' | 'ask', flagReason: string): string {
  for (const rule of LABEL_MAP) {
    if (rule.pattern.test(flagReason)) {
      return rule.labels[action] || DEFAULT_LABELS[action];
    }
  }
  return DEFAULT_LABELS[action];
}

export type { Recommendation };
