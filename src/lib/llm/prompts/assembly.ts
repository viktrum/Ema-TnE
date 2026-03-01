import type { LLMMessage } from "@/lib/llm/types";

// Flexible types matching the Supabase JSONB schema
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ScenarioData = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PolicyData = Record<string, any>;

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
  policy: PolicyData,
): LLMMessage[] {
  const context = scenario.context || {};

  const userPrompt = `TRAVELER PROFILE:
${JSON.stringify(
  {
    name: scenario.traveler?.name || scenario.name,
    employee_id: scenario.traveler?.employee_id,
    role: scenario.traveler?.role,
    department: scenario.traveler?.department,
    business_unit: scenario.traveler?.business_unit,
    cost_center: scenario.traveler?.cost_center,
    approver: scenario.traveler?.approver,
  },
  null,
  2,
)}

TRIP DETAILS:
Destination: ${scenario.destination || scenario.trip?.destination}
Dates: ${scenario.start_date || scenario.trip?.start_date} to ${scenario.end_date || scenario.trip?.end_date}
Type: ${scenario.trip_type || scenario.trip?.type}
Purpose: ${scenario.purpose || scenario.trip?.purpose}

CORPORATE CARD TRANSACTIONS:
${JSON.stringify(scenario.transactions || [], null, 2)}

CONTEXT FROM ENTERPRISE SYSTEMS:

Calendar Events:
${JSON.stringify(context.calendar || context.calendar_events || [], null, 2)}

CRM Records:
${JSON.stringify(context.crm || context.crm_records || [], null, 2)}

Email Confirmations:
${JSON.stringify(context.email || context.email_confirmations || [], null, 2)}

HRMS Profile:
${JSON.stringify(context.hrms || context.hrms_profile || {}, null, 2)}

Pre-Approval:
${JSON.stringify(context.pre_approval || {}, null, 2)}

COMPANY T&E POLICY:
Domestic Rules:
${JSON.stringify(policy.domestic || {}, null, 2)}

International Rules:
${JSON.stringify(policy.international || {}, null, 2)}

Assemble the complete expense report. Return valid JSON matching the AssemblyOutput schema with this structure:
{
  "report": {
    "id": "RPT-...",
    "traveler": "Name",
    "trip_summary": "Destination, Dates — Purpose",
    "total_amount": number,
    "currency": "INR",
    "cost_center": "...",
    "approver": "...",
    "items": [{ "id", "description", "vendor", "date", "amount", "currency", "category", "original_category", "confidence", "sources", "reasoning", "policy_status", "flag_reason", "recommendation" }],
    "flagged_items": [...],
    "missing_items": [{ "id", "detected_gap", "estimated_amount", "currency", "evidence", "confidence", "action_needed" }],
    "summary": { "total_items", "auto_approve_count", "review_count", "missing_count", "total_amount", "overall_confidence" }
  }
}`;

  return [
    { role: "system", content: ASSEMBLY_SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];
}
