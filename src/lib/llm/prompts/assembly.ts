import type { LLMMessage } from '@/lib/llm/types';

export interface ScenarioData {
  traveler: {
    name: string;
    employee_id: string;
    department: string;
    cost_center: string;
    approver: string;
  };
  trip: {
    purpose: string;
    dates: { start: string; end: string };
    destinations: string[];
  };
  transactions: Array<{
    id: string;
    date: string;
    vendor: string;
    amount: number;
    currency: string;
    description: string;
    card_last_four?: string;
  }>;
  context: {
    calendar_events?: Array<{
      date: string;
      title: string;
      attendees?: string[];
      location?: string;
    }>;
    crm_records?: Array<{
      deal_id: string;
      company: string;
      contact: string;
      stage: string;
      value?: string;
    }>;
    email_confirmations?: Array<{
      subject: string;
      date: string;
      vendor?: string;
      amount?: number;
      confirmation_number?: string;
    }>;
    hrms_profile?: {
      grade: string;
      travel_tier: string;
      home_city: string;
    };
  };
}

export interface PolicyData {
  categories: Array<{
    name: string;
    limit: number;
    currency: string;
    receipt_threshold: number;
    rules: string[];
  }>;
  general_rules: string[];
}

const ASSEMBLY_SYSTEM_PROMPT = `You are the T&E AI Employee for NexGen Industries, powered by Ema's Generative Workflow Engine.

ROLE: Replace the manual work of a T&E administrator. Assemble expense reports by reasoning across multiple enterprise systems simultaneously.

TASK: A traveler has returned from a business trip. You have access to: corporate card transactions, calendar, CRM records, HRMS profile, email confirmations, and company T&E policy. Assemble a complete expense report.

INSTRUCTIONS:

1. MATCH TRANSACTIONS TO CONTEXT: For every transaction, cross-reference ALL available context sources. A dinner is not just a dinner — check calendar for meetings, check CRM for active deals, check policy for correct category and limit.

2. CATEGORIZE WITH JUDGMENT: Use company policy categories. When a transaction could belong to multiple categories, pick the one supported by the MOST cross-system evidence. If re-categorizing (e.g., Personal Meal → Client Entertainment), state: original category → final category → exactly why.

3. SCORE CONFIDENCE HONESTLY:
   - 95-100%: Multiple independent sources confirm
   - 85-94%: Strong evidence but one source indirect
   - 70-84%: Partial evidence, some sources missing
   - Below 70%: Weak evidence, missing receipt, or conflicting signals
   Never inflate confidence. Missing receipt is NOT 95%.

4. DETECT GAPS: Look for missing transactions. If traveler went A→B (per calendar/hotel/restaurant) but no transport transaction exists, flag as gap. Estimate cost based on distance and typical fares.

5. CITE SPECIFIC SYSTEMS AND DATA: Name the SPECIFIC systems and data points. Not "based on available data" — say "Google Calendar shows meeting titled 'Reliance - Quarterly Review' on Feb 25 at Reliance Industries Mumbai office" and "Salesforce CRM confirms Deal #RLN-2026-Q1: ₹2Cr pipeline, Stage: Negotiation, Contact: Vikram Mehta (VP Procurement)."

6. RECOMMEND ACTIONS:
   - "auto_approve" → all evidence aligns, within policy, confidence >= 95%
   - "approve_with_review" → evidence supports but notable (re-categorization, near limit, context-dependent judgment). Route to manager WITH reasoning.
   - "flag_for_review" → insufficient evidence, potential violation, or anomaly. Route to manager with specific questions.
   - "request_employee_input" → missing info only employee can provide (cash amount, receipt, clarification).

7. FORMAT: Return valid JSON matching AssemblyOutput schema. All amounts in original currency. Do NOT round.`;

export function buildAssemblyMessages(
  scenario: ScenarioData,
  policy: PolicyData
): LLMMessage[] {
  const userPrompt = `TRAVELER PROFILE:
Name: ${scenario.traveler.name}
Employee ID: ${scenario.traveler.employee_id}
Department: ${scenario.traveler.department}
Cost Center: ${scenario.traveler.cost_center}
Approver: ${scenario.traveler.approver}

TRIP DETAILS:
Purpose: ${scenario.trip.purpose}
Dates: ${scenario.trip.dates.start} to ${scenario.trip.dates.end}
Destinations: ${scenario.trip.destinations.join(', ')}

CORPORATE CARD TRANSACTIONS:
${JSON.stringify(scenario.transactions, null, 2)}

CONTEXT FROM ENTERPRISE SYSTEMS:

Calendar Events:
${scenario.context.calendar_events ? JSON.stringify(scenario.context.calendar_events, null, 2) : 'No calendar data available'}

CRM Records:
${scenario.context.crm_records ? JSON.stringify(scenario.context.crm_records, null, 2) : 'No CRM data available'}

Email Confirmations:
${scenario.context.email_confirmations ? JSON.stringify(scenario.context.email_confirmations, null, 2) : 'No email confirmations available'}

HRMS Profile:
${scenario.context.hrms_profile ? JSON.stringify(scenario.context.hrms_profile, null, 2) : 'No HRMS data available'}

COMPANY T&E POLICY:
Categories and Limits:
${JSON.stringify(policy.categories, null, 2)}

General Rules:
${policy.general_rules.map((rule, i) => `${i + 1}. ${rule}`).join('\n')}

Assemble the complete expense report. Return valid JSON matching the AssemblyOutput schema.`;

  return [
    { role: 'system', content: ASSEMBLY_SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ];
}
