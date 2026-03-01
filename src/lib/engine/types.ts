// Types for the deterministic assembly engine

export interface RawTransaction {
  id: string;
  date: string;
  amount: number;
  currency: string;
  description: string;
  category: string;
  original_category: string;
  status: string;
  sources: string[];
  confidence: number;
  has_receipt: boolean;
  payment_method: string;
  policy_check?: {
    limit: number;
    within_limit: boolean;
    applicable_rule: string;
  };
  re_categorization?: {
    from: string;
    to: string;
    reason: string;
    evidence: string[];
  };
  gap_detection?: {
    type: string;
    reason: string;
    from_location: string;
    to_location: string;
    needs_confirmation: boolean;
    estimated_distance_km: number;
  };
}

export interface RawScenario {
  id: string;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  trip_type: string;
  purpose: string;
  trip_id?: string;
  transactions: unknown;
  context: {
    calendar?: Array<{
      date: string;
      time: string;
      title: string;
      location?: string;
      attendees?: string[];
      duration_hours?: number;
    }>;
    crm?: Array<{
      account_name: string;
      deal_name?: string;
      deal_id?: string;
      deal_value: number;
      stage: string;
      contact_name: string;
      contact_title?: string;
    }>;
    hrms?: {
      employee_id: string;
      employee_name: string;
      cost_center: string;
      approver_name: string;
      travel_policy_tier: string;
    };
    email?: Array<{
      subject: string;
      from: string;
      type: string;
    }>;
    pre_approval?: {
      id: string;
      approved_by: string;
      budget: number;
    };
  };
  // Flat fields from seed
  trip?: {
    destination: string;
    dates: string;
    purpose: string;
    type: string;
    pre_approval?: { id: string; budget: number };
  };
  traveler?: {
    name: string;
    employee_id: string;
    cost_center: string;
    approver: string;
    department?: string;
    grade?: string;
  };
  items?: RawTransaction[];
  summary?: {
    total_amount: number;
    currency: string;
    item_count: number;
    avg_confidence: number;
    budget: number;
  };
}

export interface RawPolicy {
  id: string;
  domestic: {
    flights?: { economy_max_hours?: number };
    accommodation?: Record<string, number>;
    meals?: { standard_per_day?: number; team_per_person?: number; client_entertainment_per_event?: number };
    transport?: { airport_transfer?: number; local_per_day?: number; no_receipt_threshold?: number };
    receipts_required_above?: number;
    trip_ceiling?: number;
  };
  international: Record<string, unknown>;
}

export interface AssembledItem {
  id: string;
  description: string;
  vendor: string;
  date: string;
  amount: number;
  currency: string;
  category: string;
  original_category: string | null;
  confidence: number;
  sources: string[];
  reasoning: string;
  policy_status: string;
  flag_reason: string | null;
  recommendation: string;
}

export interface AssembledReport {
  id: string;
  traveler: string;
  trip_summary: string;
  total_amount: number;
  currency: string;
  cost_center: string;
  approver: string;
  items: AssembledItem[];
  flagged_items: AssembledItem[];
  missing_items: Array<{
    id: string;
    detected_gap: string;
    estimated_amount: number;
    currency: string;
    evidence: string;
    confidence: number;
    action_needed: string;
  }>;
  summary: {
    total_items: number;
    auto_approve_count: number;
    review_count: number;
    missing_count: number;
    total_amount: number;
    overall_confidence: number;
  };
}
