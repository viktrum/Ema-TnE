-- Migration 002: Fix dashboard_reports status constraint and approvals FK
--
-- Issues fixed:
-- 1. approvals.report_id FK too strict — used by both chat reports (TEXT) and dashboard reports (SERIAL)
-- 2. dashboard_reports.status only allowed 'auto_approved'|'flagged', needs 'rejected'|'pending_info'

-- ============================================================================
-- 1. Drop strict FK on approvals.report_id — keep as TEXT, no FK
--    (approvals serves both chat reports with TEXT ids and dashboard reports with SERIAL ids)
-- ============================================================================

ALTER TABLE approvals DROP CONSTRAINT IF EXISTS approvals_report_id_fkey;

-- ============================================================================
-- 2. Expand dashboard_reports.status CHECK to include rejected/pending_info
-- ============================================================================

ALTER TABLE dashboard_reports DROP CONSTRAINT IF EXISTS dashboard_reports_status_check;

ALTER TABLE dashboard_reports ADD CONSTRAINT dashboard_reports_status_check
  CHECK (status IN ('auto_approved', 'flagged', 'rejected', 'pending_info'));

-- ============================================================================
-- 3. Drop strict FK on audit_log.report_id similarly
-- ============================================================================

ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_report_id_fkey;
