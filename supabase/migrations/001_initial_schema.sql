-- ============================================================================
-- 001_initial_schema.sql
-- T&E Prototype - Initial Database Schema
-- Creates all 10 tables, RLS policies, indexes, and realtime subscriptions
-- ============================================================================

-- ============================================================================
-- TABLE 1: users
-- ============================================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('employee', 'manager', 'chro', 'admin')),
  employee_id TEXT UNIQUE,
  title TEXT,
  department TEXT,
  business_unit TEXT,
  cost_center TEXT,
  grade TEXT,
  approver_id UUID REFERENCES users(id),
  avatar_initials TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Helper function to get current user's role (must be after users table)
CREATE OR REPLACE FUNCTION get_user_role() RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_insert_admin" ON users
  FOR INSERT WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "users_update_admin" ON users
  FOR UPDATE USING (get_user_role() = 'admin');

-- ============================================================================
-- TABLE 2: scenarios
-- ============================================================================

CREATE TABLE scenarios (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  traveler_id UUID REFERENCES users(id),
  destination TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  trip_type TEXT NOT NULL CHECK (trip_type IN ('domestic', 'international')),
  purpose TEXT NOT NULL,
  trip_id TEXT,
  pre_approval_id TEXT,
  pre_approval_budget NUMERIC,
  transactions JSONB NOT NULL DEFAULT '[]',
  context JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scenarios_select_authenticated" ON scenarios
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================================
-- TABLE 3: policies
-- ============================================================================

CREATE TABLE policies (
  id TEXT PRIMARY KEY DEFAULT 'nexgen-v4.2',
  version TEXT NOT NULL DEFAULT '4.2',
  company TEXT NOT NULL DEFAULT 'NexGen Industries',
  domestic JSONB NOT NULL,
  international JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "policies_select_authenticated" ON policies
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================================
-- TABLE 4: reports
-- ============================================================================

CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  scenario_id TEXT REFERENCES scenarios(id),
  user_id UUID REFERENCES users(id),
  traveler_name TEXT NOT NULL,
  trip_summary TEXT NOT NULL,
  total_amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  cost_center TEXT,
  approver_name TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  flagged_items JSONB NOT NULL DEFAULT '[]',
  missing_items JSONB NOT NULL DEFAULT '[]',
  summary JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_select_own_or_elevated" ON reports
  FOR SELECT USING (
    user_id = auth.uid()
    OR get_user_role() IN ('manager', 'chro', 'admin')
  );

CREATE POLICY "reports_insert_own" ON reports
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "reports_update_own" ON reports
  FOR UPDATE USING (user_id = auth.uid());

-- ============================================================================
-- TABLE 5: chat_messages
-- ============================================================================

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  scenario_id TEXT REFERENCES scenarios(id),
  role TEXT NOT NULL CHECK (role IN ('assistant', 'user')),
  content TEXT NOT NULL,
  actions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_messages_select_own" ON chat_messages
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "chat_messages_insert_own" ON chat_messages
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- TABLE 6: approvals
-- ============================================================================

CREATE TABLE approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id TEXT REFERENCES reports(id),
  item_id TEXT,
  reviewer_id UUID REFERENCES users(id),
  action TEXT NOT NULL CHECK (action IN ('approve', 'reject', 'ask_employee')),
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approvals_select_elevated" ON approvals
  FOR SELECT USING (get_user_role() IN ('manager', 'chro', 'admin'));

CREATE POLICY "approvals_insert_elevated" ON approvals
  FOR INSERT WITH CHECK (get_user_role() IN ('manager', 'chro', 'admin'));

-- ============================================================================
-- TABLE 7: dashboard_reports
-- ============================================================================

CREATE TABLE dashboard_reports (
  id SERIAL PRIMARY KEY,
  scenario_id TEXT,
  traveler_name TEXT NOT NULL,
  traveler_role TEXT,
  traveler_initials TEXT,
  destination TEXT NOT NULL,
  dates TEXT NOT NULL,
  total_amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  item_count INTEGER NOT NULL,
  avg_confidence INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('auto_approved', 'flagged')),
  flag_reason TEXT,
  flag_severity TEXT CHECK (flag_severity IN ('LOW', 'MEDIUM', 'HIGH')),
  items JSONB DEFAULT '[]',
  reasoning JSONB DEFAULT '{}',
  sources JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE dashboard_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dashboard_reports_select_authenticated" ON dashboard_reports
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================================
-- TABLE 8: fallbacks
-- ============================================================================

CREATE TABLE fallbacks (
  id TEXT PRIMARY KEY,
  scenario_id TEXT NOT NULL,
  type TEXT NOT NULL,
  response JSONB NOT NULL,
  text TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE fallbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fallbacks_select_authenticated" ON fallbacks
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================================
-- TABLE 9: audit_log
-- ============================================================================

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  report_id TEXT,
  scenario_id TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_select_elevated" ON audit_log
  FOR SELECT USING (get_user_role() IN ('admin', 'chro'));

CREATE POLICY "audit_log_insert_authenticated" ON audit_log
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- TABLE 10: ai_metrics
-- ============================================================================

CREATE TABLE ai_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_type TEXT NOT NULL,
  model TEXT NOT NULL,
  latency_ms INTEGER NOT NULL,
  tokens_in INTEGER,
  tokens_out INTEGER,
  confidence INTEGER,
  fallback_used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ai_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_metrics_select_admin" ON ai_metrics
  FOR SELECT USING (get_user_role() = 'admin');

CREATE POLICY "ai_metrics_insert_authenticated" ON ai_metrics
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- INDEXES
-- ============================================================================

-- users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_approver_id ON users(approver_id);
CREATE INDEX idx_users_department ON users(department);

-- scenarios
CREATE INDEX idx_scenarios_traveler_id ON scenarios(traveler_id);
CREATE INDEX idx_scenarios_trip_type ON scenarios(trip_type);

-- reports
CREATE INDEX idx_reports_scenario_id ON reports(scenario_id);
CREATE INDEX idx_reports_user_id ON reports(user_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_created_at ON reports(created_at);

-- chat_messages
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_scenario_id ON chat_messages(scenario_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- approvals
CREATE INDEX idx_approvals_report_id ON approvals(report_id);
CREATE INDEX idx_approvals_reviewer_id ON approvals(reviewer_id);
CREATE INDEX idx_approvals_action ON approvals(action);

-- dashboard_reports
CREATE INDEX idx_dashboard_reports_scenario_id ON dashboard_reports(scenario_id);
CREATE INDEX idx_dashboard_reports_status ON dashboard_reports(status);

-- fallbacks
CREATE INDEX idx_fallbacks_scenario_id ON fallbacks(scenario_id);
CREATE INDEX idx_fallbacks_type ON fallbacks(type);

-- audit_log
CREATE INDEX idx_audit_log_event_type ON audit_log(event_type);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_report_id ON audit_log(report_id);
CREATE INDEX idx_audit_log_scenario_id ON audit_log(scenario_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- ai_metrics
CREATE INDEX idx_ai_metrics_prompt_type ON ai_metrics(prompt_type);
CREATE INDEX idx_ai_metrics_created_at ON ai_metrics(created_at);

-- ============================================================================
-- REALTIME
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE reports;
ALTER PUBLICATION supabase_realtime ADD TABLE approvals;
