-- Migration 003: Enable realtime for bidirectional flow (Phase 3.5)
--
-- Flow 1 (Tanya submits → Mihir sees): dashboard_reports needs realtime + INSERT RLS
-- Flow 2 (Mihir acts → Tanya sees): chat_messages needs realtime + manager INSERT RLS

-- Add dashboard_reports to realtime publication (for submit → dashboard)
ALTER PUBLICATION supabase_realtime ADD TABLE dashboard_reports;

-- Add chat_messages to realtime publication (for approval → chat)
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- Allow authenticated users to INSERT into dashboard_reports (report.submit needs this)
CREATE POLICY "dashboard_reports_insert_authenticated" ON dashboard_reports
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow managers to insert chat messages on behalf of Ema (notification delivery)
CREATE POLICY "chat_messages_insert_elevated" ON chat_messages
  FOR INSERT WITH CHECK (get_user_role() IN ('manager', 'chro', 'admin'));
