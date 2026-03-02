-- Add Slack as a source to relevant flagged items
-- Nitin Shah: Flight upgrade — Slack convo with VP pre-approving business class for client meeting
UPDATE dashboard_reports
SET sources = '["Policy", "HRMS", "Booking System", "Slack"]',
    reasoning = '{"summary":"Business class flight BOM→SIN at ₹68,000. Employee is L5 grade — policy requires L6+ for business class on flights over 6 hours, and this route is 5.5 hours. However, Slack conversation shows VP Sanjay Kumar pre-approved business class for this specific client meeting. Double violation on paper, but pre-approval exists in Slack.","ai_reasoning":"Policy check: international business class requires L6+ AND flight duration >6 hours. Nitin Shah is L5 and BOM-SIN is 5.5 hours. Neither condition met. However, Slack thread #travel-approvals shows VP Sanjay Kumar writing ''Approved business class for Nitin — critical client demo in Singapore'' on Feb 5. Flagged for manager to reconcile policy vs pre-approval."}'
WHERE traveler_name = 'Nitin Shah'
AND flag_reason LIKE '%Unauthorized Flight Upgrade%';

-- Priya Nair: Team lunch — Slack thread discussing team outing budget
UPDATE dashboard_reports
SET sources = '["Policy", "Pre-Approval System", "HRMS", "Slack"]',
    reasoning = '{"summary":"Team lunch for 8 at ₹18,900 (₹2,362/person) exceeds team meal policy of ₹2,000/person. Team events over ₹10,000 require separate pre-approval which was not found in ServiceNow. However, Slack thread in #bangalore-team shows discussion about team lunch with budget mentioned.","ai_reasoning":"Per-person cost of ₹2,362 exceeds ₹2,000 team meal limit by 18%. Additionally, team events exceeding ₹10,000 require dedicated pre-approval — none found in ServiceNow. Slack thread in #bangalore-team from Feb 21 shows Priya asking ''team lunch tomorrow, budget around 2k per head?'' with 6 thumbs-up reactions. Informal approval exists but formal pre-approval is missing."}'
WHERE traveler_name = 'Priya Nair'
AND flag_reason LIKE '%Missing Pre-Approval%';

-- Kavita Deshmukh: Phantom Client Dinner — add Slack for context
UPDATE dashboard_reports
SET sources = '["CRM", "Calendar", "Email", "Policy", "Slack"]'
WHERE traveler_name = 'Kavita Deshmukh'
AND flag_reason LIKE '%Phantom Client%';
