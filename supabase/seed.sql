-- ============================================================================
-- seed.sql
-- T&E Prototype - Complete Seed Data
-- Runs after 001_initial_schema.sql migration
-- ============================================================================

-- ============================================================================
-- 1. AUTH USERS (auth.users + auth.identities)
-- ============================================================================

INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, role, aud, created_at, updated_at)
VALUES
  ('a1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'tanya@nexgen.demo', crypt('demo1234', gen_salt('bf')), now(), '{"name":"Tanya Sharma","role":"employee"}', 'authenticated', 'authenticated', now(), now()),
  ('a2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'mihir@nexgen.demo', crypt('demo1234', gen_salt('bf')), now(), '{"name":"Mihir Desai","role":"manager"}', 'authenticated', 'authenticated', now(), now()),
  ('a3333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'chitra@nexgen.demo', crypt('demo1234', gen_salt('bf')), now(), '{"name":"Chitra Nair","role":"chro"}', 'authenticated', 'authenticated', now(), now()),
  ('a4444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'admin@nexgen.demo', crypt('demo1234', gen_salt('bf')), now(), '{"name":"Admin","role":"admin"}', 'authenticated', 'authenticated', now(), now());

INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'tanya@nexgen.demo', 'email', '{"sub":"a1111111-1111-1111-1111-111111111111","email":"tanya@nexgen.demo"}', now(), now(), now()),
  ('a2222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 'mihir@nexgen.demo', 'email', '{"sub":"a2222222-2222-2222-2222-222222222222","email":"mihir@nexgen.demo"}', now(), now(), now()),
  ('a3333333-3333-3333-3333-333333333333', 'a3333333-3333-3333-3333-333333333333', 'chitra@nexgen.demo', 'email', '{"sub":"a3333333-3333-3333-3333-333333333333","email":"chitra@nexgen.demo"}', now(), now(), now()),
  ('a4444444-4444-4444-4444-444444444444', 'a4444444-4444-4444-4444-444444444444', 'admin@nexgen.demo', 'email', '{"sub":"a4444444-4444-4444-4444-444444444444","email":"admin@nexgen.demo"}', now(), now(), now());

-- ============================================================================
-- 2. PUBLIC USERS
-- ============================================================================

INSERT INTO users (id, email, name, role, employee_id, title, department, business_unit, cost_center, grade, approver_id, avatar_initials) VALUES
('a1111111-1111-1111-1111-111111111111', 'tanya@nexgen.demo', 'Tanya Sharma', 'employee', 'NXG-4521', 'Senior Account Manager', 'Enterprise Sales', 'ENT-WEST', 'CC-ENT-WEST-2026', 'L5', 'a2222222-2222-2222-2222-222222222222', 'TS'),
('a2222222-2222-2222-2222-222222222222', 'mihir@nexgen.demo', 'Mihir Desai', 'manager', 'NXG-3187', 'Engineering Manager', 'Engineering', 'ENG-CORE', 'CC-ENG-CORE-2026', 'L6', NULL, 'MD'),
('a3333333-3333-3333-3333-333333333333', 'chitra@nexgen.demo', 'Chitra Nair', 'chro', 'NXG-1001', 'Chief HR Officer', 'Human Resources', 'HR-EXEC', 'CC-HR-EXEC-2026', 'L8', NULL, 'CN'),
('a4444444-4444-4444-4444-444444444444', 'admin@nexgen.demo', 'System Admin', 'admin', 'NXG-0001', 'System Administrator', 'IT', 'IT-OPS', 'CC-IT-OPS-2026', 'L7', NULL, 'SA');

-- ============================================================================
-- 3. POLICY
-- ============================================================================

INSERT INTO policies (id, version, company, domestic, international) VALUES (
  'nexgen-v4.2',
  '4.2',
  'NexGen Industries',
  '{
    "flights": {
      "economy": "All flights under 4 hours",
      "business": "L6+ for flights over 4 hours",
      "advance_booking_days": 7,
      "preferred_airlines": ["IndiGo", "Air India", "Vistara"]
    },
    "accommodation": {
      "tiers": {
        "tier1_cities": {"cities": ["Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad"], "limit": 12000, "currency": "INR"},
        "tier2_cities": {"cities": ["Pune", "Ahmedabad", "Kolkata", "Jaipur", "Lucknow", "Chandigarh"], "limit": 8000, "currency": "INR"},
        "tier3_cities": {"cities": ["All other cities"], "limit": 5000, "currency": "INR"}
      },
      "preferred_chains": ["Taj", "ITC", "Marriott", "Hyatt"]
    },
    "meals": {
      "standard_per_day": 5000,
      "team_per_person": 2000,
      "client_entertainment_per_event": 15000,
      "currency": "INR"
    },
    "transport": {
      "airport_transfer": 2000,
      "local_per_day": 3000,
      "no_receipt_max": 1500,
      "preferred_providers": ["Uber", "Ola"],
      "currency": "INR"
    },
    "receipts": {
      "required_above": 500,
      "currency": "INR"
    },
    "trip_ceiling": 50000,
    "currency": "INR"
  }',
  '{
    "flights": {
      "economy": "All flights under 6 hours",
      "business": "L6+ for flights over 6 hours",
      "advance_booking_days": 14,
      "preferred_airlines": ["Air India", "British Airways", "Emirates", "Singapore Airlines"]
    },
    "accommodation": {
      "tiers": {
        "tier1_cities": {"cities": ["London", "New York", "San Francisco", "Singapore", "Tokyo", "Zurich", "Sydney"], "limit": 200, "currency": "GBP"},
        "tier2_cities": {"cities": ["All other international cities"], "limit": 150, "currency": "GBP"}
      }
    },
    "meals": {
      "standard_per_day": 50,
      "client_per_person": 75,
      "currency": "GBP"
    },
    "per_diem": {
      "europe": {"amount": 80, "currency": "GBP"},
      "americas": {"amount": 100, "currency": "USD"},
      "apac": {"amount": 70, "currency": "USD"},
      "mena": {"amount": 80, "currency": "USD"}
    },
    "receipts": {
      "required_above": 20,
      "no_receipt_max": 30,
      "currency": "GBP"
    }
  }'
);

-- ============================================================================
-- 4. SCENARIOS
-- ============================================================================

-- Mumbai Trip (PRIMARY)
INSERT INTO scenarios (id, name, traveler_id, destination, start_date, end_date, trip_type, purpose, trip_id, pre_approval_id, pre_approval_budget, transactions, context) VALUES (
  'mumbai-trip',
  'Mumbai Client Visit — Reliance QBR',
  'a1111111-1111-1111-1111-111111111111',
  'Mumbai',
  '2026-02-24',
  '2026-02-26',
  'domestic',
  'Client visit — Reliance Industries quarterly business review',
  'TRIP-2026-0224-TS',
  'PA-2026-0218-TS',
  50000,
  '[
    {
      "id": "TXN-001",
      "description": "IndiGo 6E-2145 BLR→BOM",
      "date": "2026-02-24",
      "time": "06:15",
      "amount": 4850,
      "currency": "INR",
      "payment_method": "corporate_card",
      "category": "Airlines",
      "merchant": "IndiGo Airlines",
      "has_receipt": true
    },
    {
      "id": "TXN-002",
      "description": "Taj Lands End (2 nights)",
      "date": "2026-02-24",
      "end_date": "2026-02-26",
      "amount": 18400,
      "currency": "INR",
      "payment_method": "corporate_card",
      "category": "Hotels",
      "merchant": "Taj Lands End Mumbai",
      "has_receipt": true
    },
    {
      "id": "TXN-003",
      "description": "Uber Airport→Hotel",
      "date": "2026-02-24",
      "time": "08:30",
      "amount": 780,
      "currency": "INR",
      "payment_method": "corporate_card",
      "category": "Transportation",
      "merchant": "Uber",
      "has_receipt": true
    },
    {
      "id": "TXN-004",
      "description": "Dinner at Trishna",
      "date": "2026-02-25",
      "time": "19:15",
      "amount": 8500,
      "currency": "INR",
      "payment_method": "corporate_card",
      "category": "Restaurants",
      "merchant": "Trishna Restaurant",
      "has_receipt": true
    },
    {
      "id": "TXN-005",
      "description": "Uber to Reliance Office",
      "date": "2026-02-25",
      "time": "10:00",
      "amount": 350,
      "currency": "INR",
      "payment_method": "corporate_card",
      "category": "Transportation",
      "merchant": "Uber",
      "has_receipt": true
    },
    {
      "id": "TXN-006",
      "description": "IndiGo BOM→BLR",
      "date": "2026-02-26",
      "time": "14:00",
      "amount": 5200,
      "currency": "INR",
      "payment_method": "corporate_card",
      "category": "Airlines",
      "merchant": "IndiGo Airlines",
      "has_receipt": true
    },
    {
      "id": "TXN-007",
      "description": "Local taxi (gap-detected)",
      "date": "2026-02-25",
      "time": "19:00",
      "amount": 1200,
      "currency": "INR",
      "payment_method": "cash",
      "category": "Transportation",
      "merchant": "Local Taxi",
      "has_receipt": false
    }
  ]',
  '{
    "calendar": [
      {
        "date": "2026-02-25",
        "time": "10:00",
        "title": "Reliance - Quarterly Review",
        "location": "Reliance Corporate Park, Ghansoli",
        "attendees": ["tanya.sharma@nexgen.com", "vikram.mehta@ril.com", "deepak.nair@ril.com"],
        "duration_hours": 2
      },
      {
        "date": "2026-02-25",
        "time": "19:00",
        "title": "Client Dinner - Reliance Team",
        "location": "Trishna Restaurant, Fort",
        "attendees": ["tanya.sharma@nexgen.com", "vikram.mehta@ril.com"],
        "duration_hours": 2.5
      }
    ],
    "crm": [
      {
        "account_name": "Reliance Industries Limited",
        "deal_name": "NexGen Platform Enterprise License — Reliance",
        "deal_id": "RLN-2026-Q1",
        "deal_value": 20000000,
        "stage": "Negotiation",
        "probability": 65,
        "contact_name": "Vikram Mehta",
        "contact_title": "VP Procurement",
        "contact_email": "vikram.mehta@ril.com",
        "expected_close": "2026-04-30"
      }
    ],
    "hrms": {
      "employee_id": "NXG-4521",
      "employee_name": "Tanya Sharma",
      "cost_center": "CC-ENT-WEST-2026",
      "approver_name": "Mihir Desai",
      "travel_policy_tier": "standard",
      "trips_last_12_months": 8,
      "avg_expense": 32500,
      "compliance_rate": 98
    },
    "email": [
      {
        "subject": "IndiGo Booking Confirmation - PNR: ABC123",
        "from": "bookings@indigo.in",
        "type": "flight_confirmation",
        "extracted_data": {"pnr": "ABC123", "route": "BLR-BOM", "date": "2026-02-24"}
      },
      {
        "subject": "Taj Lands End Reservation Confirmed",
        "from": "reservations@tajhotels.com",
        "type": "hotel_confirmation",
        "extracted_data": {"confirmation": "TAJ-98765", "checkin": "2026-02-24", "checkout": "2026-02-26"}
      },
      {
        "subject": "Reliance Quarterly Review - Meeting Invite",
        "from": "vikram.mehta@ril.com",
        "type": "meeting_invite",
        "extracted_data": {"date": "2026-02-25", "location": "Reliance Corporate Park"}
      }
    ],
    "pre_approval": {
      "id": "PA-2026-0218-TS",
      "approved_by": "Mihir Desai",
      "approved_date": "2026-02-18",
      "budget": 50000,
      "category": "Client Visit",
      "notes": "Approved for 2-night Mumbai trip. Client dinner budget included."
    }
  }'
);

-- Bangalore Trip
INSERT INTO scenarios (id, name, traveler_id, destination, start_date, end_date, trip_type, purpose, trip_id, pre_approval_id, pre_approval_budget, transactions, context) VALUES (
  'bangalore-trip',
  'Bangalore Engineering Offsite',
  'a2222222-2222-2222-2222-222222222222',
  'Bangalore',
  '2026-02-22',
  '2026-02-23',
  'domestic',
  'Engineering offsite — quarterly team meetup',
  'TRIP-2026-0222-VR',
  'PA-2026-0215-VR',
  40000,
  '[
    {
      "id": "TXN-B01",
      "description": "IndiGo 6E-3021 DEL→BLR",
      "date": "2026-02-22",
      "time": "07:00",
      "amount": 5200,
      "currency": "INR",
      "payment_method": "corporate_card",
      "category": "Airlines",
      "merchant": "IndiGo Airlines",
      "has_receipt": true
    },
    {
      "id": "TXN-B02",
      "description": "ITC Gardenia (1 night)",
      "date": "2026-02-22",
      "end_date": "2026-02-23",
      "amount": 9800,
      "currency": "INR",
      "payment_method": "corporate_card",
      "category": "Hotels",
      "merchant": "ITC Gardenia Bangalore",
      "has_receipt": true
    },
    {
      "id": "TXN-B03",
      "description": "Team lunch at Karavalli — 8 attendees",
      "date": "2026-02-22",
      "time": "13:00",
      "amount": 18900,
      "currency": "INR",
      "payment_method": "corporate_card",
      "category": "Restaurants",
      "merchant": "Karavalli Restaurant",
      "has_receipt": true,
      "attendees": 8
    },
    {
      "id": "TXN-B04",
      "description": "IndiGo 6E-3044 BLR→DEL",
      "date": "2026-02-23",
      "time": "18:30",
      "amount": 5600,
      "currency": "INR",
      "payment_method": "corporate_card",
      "category": "Airlines",
      "merchant": "IndiGo Airlines",
      "has_receipt": true
    }
  ]',
  '{
    "calendar": [
      {
        "date": "2026-02-22",
        "time": "10:00",
        "title": "Q1 Engineering Offsite - Day 1",
        "location": "NexGen Bangalore Office, Whitefield",
        "attendees": ["vikram.rao@nexgen.com", "team-engineering@nexgen.com"],
        "duration_hours": 8
      },
      {
        "date": "2026-02-22",
        "time": "13:00",
        "title": "Team Lunch - Karavalli",
        "location": "Karavalli, The Gateway Hotel",
        "attendees": ["vikram.rao@nexgen.com", "team-engineering@nexgen.com"],
        "duration_hours": 1.5
      }
    ],
    "hrms": {
      "employee_id": "NXG-3187",
      "employee_name": "Mihir Desai",
      "cost_center": "CC-ENG-CORE-2026",
      "approver_name": "Chitra Nair",
      "travel_policy_tier": "standard",
      "trips_last_12_months": 5,
      "avg_expense": 28000,
      "compliance_rate": 95
    },
    "pre_approval": {
      "id": "PA-2026-0215-VR",
      "approved_by": "Chitra Nair",
      "approved_date": "2026-02-15",
      "budget": 40000,
      "category": "Team Offsite",
      "notes": "Approved for 1-night Bangalore offsite. Team lunch for 8 approved."
    }
  }'
);

-- London Trip
INSERT INTO scenarios (id, name, traveler_id, destination, start_date, end_date, trip_type, purpose, trip_id, pre_approval_id, pre_approval_budget, transactions, context) VALUES (
  'london-trip',
  'London EMEA Partner Summit',
  'a3333333-3333-3333-3333-333333333333',
  'London',
  '2026-02-17',
  '2026-02-20',
  'international',
  'EMEA partner summit + client meetings',
  'TRIP-2026-0217-PK',
  'PA-2026-0210-PK',
  250000,
  '[
    {
      "id": "TXN-L01",
      "description": "British Airways BA138 BOM→LHR",
      "date": "2026-02-17",
      "time": "02:15",
      "amount": 82000,
      "currency": "INR",
      "payment_method": "corporate_card",
      "category": "Airlines",
      "merchant": "British Airways",
      "has_receipt": true,
      "original_currency": "GBP",
      "original_amount": 680
    },
    {
      "id": "TXN-L02",
      "description": "The Langham London (3 nights)",
      "date": "2026-02-17",
      "end_date": "2026-02-20",
      "amount": 72600,
      "currency": "INR",
      "payment_method": "corporate_card",
      "category": "Hotels",
      "merchant": "The Langham London",
      "has_receipt": true,
      "original_currency": "GBP",
      "original_amount": 600
    },
    {
      "id": "TXN-L03",
      "description": "Client dinner at The Ivy",
      "date": "2026-02-18",
      "time": "19:30",
      "amount": 36300,
      "currency": "INR",
      "payment_method": "corporate_card",
      "category": "Restaurants",
      "merchant": "The Ivy London",
      "has_receipt": true,
      "original_currency": "GBP",
      "original_amount": 300
    },
    {
      "id": "TXN-L04",
      "description": "Heathrow Express + London Underground",
      "date": "2026-02-17",
      "time": "10:30",
      "amount": 7260,
      "currency": "INR",
      "payment_method": "corporate_card",
      "category": "Transportation",
      "merchant": "Heathrow Express",
      "has_receipt": true,
      "original_currency": "GBP",
      "original_amount": 60
    },
    {
      "id": "TXN-L05",
      "description": "British Airways BA139 LHR→BOM",
      "date": "2026-02-20",
      "time": "21:30",
      "amount": 85000,
      "currency": "INR",
      "payment_method": "corporate_card",
      "category": "Airlines",
      "merchant": "British Airways",
      "has_receipt": true,
      "original_currency": "GBP",
      "original_amount": 700
    }
  ]',
  '{
    "calendar": [
      {
        "date": "2026-02-18",
        "time": "09:00",
        "title": "EMEA Partner Summit - Day 1",
        "location": "InterContinental London, Park Lane",
        "attendees": ["priya.k@nexgen.com", "emea-partners@nexgen.com"],
        "duration_hours": 8
      },
      {
        "date": "2026-02-18",
        "time": "19:30",
        "title": "Client Dinner - Barclays Team",
        "location": "The Ivy, West Street",
        "attendees": ["priya.k@nexgen.com", "david.wright@barclays.co.uk"],
        "duration_hours": 2.5
      },
      {
        "date": "2026-02-19",
        "time": "09:00",
        "title": "EMEA Partner Summit - Day 2",
        "location": "InterContinental London, Park Lane",
        "attendees": ["priya.k@nexgen.com", "emea-partners@nexgen.com"],
        "duration_hours": 8
      }
    ],
    "crm": [
      {
        "account_name": "Barclays PLC",
        "deal_name": "NexGen Analytics Platform — Barclays",
        "deal_id": "BAR-2026-Q1",
        "deal_value": 45000000,
        "stage": "Discovery",
        "probability": 35,
        "contact_name": "David Wright",
        "contact_title": "Head of Procurement",
        "contact_email": "david.wright@barclays.co.uk",
        "expected_close": "2026-09-30"
      }
    ],
    "hrms": {
      "employee_id": "NXG-2045",
      "employee_name": "Priya Krishnamurthy",
      "cost_center": "CC-SALES-APAC-2026",
      "approver_name": "Chitra Nair",
      "travel_policy_tier": "executive",
      "trips_last_12_months": 12,
      "avg_expense": 185000,
      "compliance_rate": 96
    },
    "pre_approval": {
      "id": "PA-2026-0210-PK",
      "approved_by": "Chitra Nair",
      "approved_date": "2026-02-10",
      "budget": 250000,
      "category": "International Conference + Client Meeting",
      "notes": "Approved for 3-night London trip. Business class approved (L7+). Client dinner included."
    }
  }'
);

-- ============================================================================
-- 5. DASHBOARD REPORTS — 9 Flagged
-- ============================================================================

-- 1. Tanya Sharma — Dinner Re-categorization (mumbai-trip)
INSERT INTO dashboard_reports (scenario_id, traveler_name, traveler_role, traveler_initials, destination, dates, total_amount, currency, item_count, avg_confidence, status, flag_reason, flag_severity, items, reasoning, sources) VALUES
('mumbai-trip', 'Tanya Sharma', 'Senior Account Manager', 'TS', 'Mumbai', 'Feb 24-26, 2026', 8500, 'INR', 1, 94, 'flagged', 'Dinner Re-categorization: ₹8,500 dinner at Trishna re-categorized from Restaurants to Client Entertainment based on calendar and CRM data', 'HIGH',
 '[{"id":"TXN-004","description":"Dinner at Trishna","amount":8500,"original_category":"Restaurants","suggested_category":"Client Entertainment","confidence":94}]',
 '{"summary":"Calendar shows client dinner with Vikram Mehta (Reliance VP Procurement) at Trishna on Feb 25. CRM confirms active deal RLN-2026-Q1 worth ₹2Cr in Negotiation stage. Re-categorized from Restaurants to Client Entertainment — within ₹15,000 policy limit.","ai_reasoning":"Cross-referenced transaction timestamp (19:15) with calendar event (19:00 Client Dinner - Reliance Team at Trishna Restaurant). Attendee Vikram Mehta matched CRM contact for Reliance deal. High confidence re-categorization."}',
 '["Calendar", "CRM", "Policy"]'
);

-- 2. Rahul Menon — Duplicate Uber Charge
INSERT INTO dashboard_reports (scenario_id, traveler_name, traveler_role, traveler_initials, destination, dates, total_amount, currency, item_count, avg_confidence, status, flag_reason, flag_severity, items, reasoning, sources) VALUES
(NULL, 'Rahul Menon', 'Product Manager', 'RM', 'Pune', 'Feb 10-11, 2026', 420, 'INR', 1, 88, 'flagged', 'Duplicate Uber Charge: ₹420 Uber ride appears twice within 5 minutes on the same route', 'MEDIUM',
 '[{"id":"TXN-RM-01","description":"Uber Hinjewadi→Magarpatta","amount":420,"category":"Transportation","duplicate_of":"TXN-RM-02","time_gap_minutes":5}]',
 '{"summary":"Two identical ₹420 Uber charges for Hinjewadi→Magarpatta route at 09:15 and 09:20 on Feb 10. Likely a duplicate charge from payment gateway. Recommend removing one.","ai_reasoning":"Identical amount, same route, 5-minute time gap strongly suggests duplicate charge rather than two separate rides."}',
 '["Transaction History", "Payment Gateway"]'
);

-- 3. Anita Desai — Missing Receipt (High Value)
INSERT INTO dashboard_reports (scenario_id, traveler_name, traveler_role, traveler_initials, destination, dates, total_amount, currency, item_count, avg_confidence, status, flag_reason, flag_severity, items, reasoning, sources) VALUES
(NULL, 'Anita Desai', 'Marketing Director', 'AD', 'Delhi', 'Feb 5-7, 2026', 14200, 'INR', 1, 72, 'flagged', 'Missing Receipt (High Value): ₹14,200 hotel charge at The Oberoi has no receipt attached', 'HIGH',
 '[{"id":"TXN-AD-01","description":"The Oberoi New Delhi (2 nights)","amount":14200,"category":"Hotels","has_receipt":false,"policy_limit":12000}]',
 '{"summary":"₹14,200 hotel charge at The Oberoi exceeds Tier 1 city limit of ₹12,000/night and has no receipt. Amount also exceeds the ₹500 no-receipt threshold. Requires receipt upload and possible over-limit justification.","ai_reasoning":"Hotel amount exceeds Delhi Tier 1 city limit by ₹2,200. No receipt attached for a charge well above the ₹500 receipt requirement. Two policy violations flagged."}',
 '["Policy", "Receipt Scanner"]'
);

-- 4. Varun Kapoor — Pattern Anomaly (Weekend Hotel)
INSERT INTO dashboard_reports (scenario_id, traveler_name, traveler_role, traveler_initials, destination, dates, total_amount, currency, item_count, avg_confidence, status, flag_reason, flag_severity, items, reasoning, sources) VALUES
(NULL, 'Varun Kapoor', 'Business Analyst', 'VK', 'Goa', 'Feb 14-16, 2026', 22500, 'INR', 1, 76, 'flagged', 'Pattern Anomaly: ₹22,500 weekend hotel stay in Goa — no meetings or business purpose found', 'MEDIUM',
 '[{"id":"TXN-VK-01","description":"Marriott Resort Goa (2 nights)","amount":22500,"category":"Hotels","day_of_week":"Saturday-Monday","has_meeting":false}]',
 '{"summary":"Weekend hotel stay in Goa (Feb 14-16, Sat-Mon) at ₹22,500. No calendar events, no client meetings, and no pre-approval found. Feb 14 is Valentine''s Day. Pattern suggests potential personal trip.","ai_reasoning":"Saturday check-in at a resort property, no business calendar entries, no CRM association, and the dates coincide with Valentine''s Day weekend. Anomaly score elevated."}',
 '["Calendar", "HRMS", "Pattern Analysis"]'
);

-- 5. Nitin Shah — Unauthorized Flight Upgrade
INSERT INTO dashboard_reports (scenario_id, traveler_name, traveler_role, traveler_initials, destination, dates, total_amount, currency, item_count, avg_confidence, status, flag_reason, flag_severity, items, reasoning, sources) VALUES
(NULL, 'Nitin Shah', 'Senior Developer', 'NS', 'Singapore', 'Feb 8-11, 2026', 68000, 'INR', 1, 95, 'flagged', 'Unauthorized Flight Upgrade: ₹68,000 business class flight — employee grade L5 not eligible for business on this route', 'HIGH',
 '[{"id":"TXN-NS-01","description":"Singapore Airlines SQ423 BOM→SIN (Business)","amount":68000,"category":"Airlines","class":"business","employee_grade":"L5","route_duration_hours":5.5}]',
 '{"summary":"Business class flight BOM→SIN at ₹68,000. Employee is L5 grade — policy requires L6+ for business class on flights over 6 hours, and this route is 5.5 hours (under the 6-hour threshold). Double violation: grade and duration.","ai_reasoning":"Policy check: international business class requires L6+ AND flight duration >6 hours. Nitin Shah is L5 and BOM-SIN is 5.5 hours. Neither condition met. Clear policy violation with high confidence."}',
 '["Policy", "HRMS", "Booking System"]'
);

-- 6. Megha Iyer — Same-Restaurant Pattern
INSERT INTO dashboard_reports (scenario_id, traveler_name, traveler_role, traveler_initials, destination, dates, total_amount, currency, item_count, avg_confidence, status, flag_reason, flag_severity, items, reasoning, sources) VALUES
(NULL, 'Megha Iyer', 'Regional Sales Lead', 'MI', 'Chennai', 'Feb 3-7, 2026', 25500, 'INR', 5, 71, 'flagged', 'Same-Restaurant Pattern: 5 meals totaling ₹25,500 at the same restaurant across a 4-day trip', 'LOW',
 '[{"id":"TXN-MI-01","description":"Dinner at Southern Spice","amount":5200,"date":"2026-02-03"},{"id":"TXN-MI-02","description":"Lunch at Southern Spice","amount":4800,"date":"2026-02-04"},{"id":"TXN-MI-03","description":"Dinner at Southern Spice","amount":5100,"date":"2026-02-05"},{"id":"TXN-MI-04","description":"Lunch at Southern Spice","amount":4900,"date":"2026-02-06"},{"id":"TXN-MI-05","description":"Dinner at Southern Spice","amount":5500,"date":"2026-02-07"}]',
 '{"summary":"5 separate meal transactions at Southern Spice restaurant across 4 days totaling ₹25,500. Average per meal ₹5,100 — each within daily limit but cumulative pattern is unusual. Could indicate habitual preference or potential misuse.","ai_reasoning":"Statistical anomaly: same merchant appearing 5 times in a 4-day trip is outside the normal distribution. Individual amounts are within policy but the pattern warrants human review."}',
 '["Transaction History", "Pattern Analysis"]'
);

-- 7. Saurabh Jain — Date Mismatch
INSERT INTO dashboard_reports (scenario_id, traveler_name, traveler_role, traveler_initials, destination, dates, total_amount, currency, item_count, avg_confidence, status, flag_reason, flag_severity, items, reasoning, sources) VALUES
(NULL, 'Saurabh Jain', 'Solution Architect', 'SJ', 'Hyderabad', 'Feb 18-19, 2026', 9800, 'INR', 1, 82, 'flagged', 'Date Mismatch: Hotel receipt date (Feb 20) does not match trip end date (Feb 19)', 'LOW',
 '[{"id":"TXN-SJ-01","description":"Novotel HICC Hyderabad","amount":9800,"category":"Hotels","receipt_date":"2026-02-20","trip_end_date":"2026-02-19"}]',
 '{"summary":"Hotel checkout receipt dated Feb 20 but trip officially ended Feb 19. One extra night may have been personal. ₹9,800 for 2 nights means ~₹4,900/night — within Tier 1 limit.","ai_reasoning":"Receipt date extends one day beyond approved trip dates. Common pattern for employees adding personal days to business trips. Amount per night is within policy but the extra night needs justification."}',
 '["Receipt Scanner", "Pre-Approval", "Calendar"]'
);

-- 8. Priya Nair — Missing Pre-Approval (FEATURED in bangalore)
INSERT INTO dashboard_reports (scenario_id, traveler_name, traveler_role, traveler_initials, destination, dates, total_amount, currency, item_count, avg_confidence, status, flag_reason, flag_severity, items, reasoning, sources) VALUES
('bangalore-trip', 'Priya Nair', 'Senior Engineer', 'PN', 'Bangalore', 'Feb 22-23, 2026', 18900, 'INR', 1, 91, 'flagged', 'Missing Pre-Approval: ₹18,900 team lunch for 8 attendees submitted without pre-approval for team events', 'MEDIUM',
 '[{"id":"TXN-B03","description":"Team lunch at Karavalli — 8 attendees","amount":18900,"category":"Restaurants","attendees":8,"per_person":2362,"policy_per_person_limit":2000}]',
 '{"summary":"Team lunch for 8 at ₹18,900 (₹2,362/person) exceeds team meal policy of ₹2,000/person. Team events over ₹10,000 require separate pre-approval which was not found.","ai_reasoning":"Per-person cost of ₹2,362 exceeds ₹2,000 team meal limit by 18%. Additionally, team events exceeding ₹10,000 require dedicated pre-approval — none found in the system."}',
 '["Policy", "Pre-Approval System", "HRMS"]'
);

-- 9. James Chen — Multi-Currency Discrepancy (FEATURED in london)
INSERT INTO dashboard_reports (scenario_id, traveler_name, traveler_role, traveler_initials, destination, dates, total_amount, currency, item_count, avg_confidence, status, flag_reason, flag_severity, items, reasoning, sources) VALUES
('london-trip', 'James Chen', 'Regional Director APAC', 'JC', 'London', 'Feb 17-20, 2026', 1840, 'GBP', 3, 89, 'flagged', 'Multi-Currency Discrepancy: GBP→INR conversion rates vary 8-12% across 3 transactions, exceeding normal 2% variance', 'HIGH',
 '[{"id":"TXN-L02","description":"The Langham London (3 nights)","amount_gbp":600,"amount_inr":72600,"rate":121.0},{"id":"TXN-L03","description":"Client dinner at The Ivy","amount_gbp":300,"amount_inr":36300,"rate":121.0},{"id":"TXN-L04","description":"Heathrow Express + Underground","amount_gbp":60,"amount_inr":7260,"rate":121.0}]',
 '{"summary":"Three GBP transactions show conversion rates varying between ₹118-132 per GBP. Market rate during Feb 17-20 was ₹121±1. The variance across card statements suggests potential manual rate manipulation or multi-source booking.","ai_reasoning":"Cross-referenced transaction conversion rates against RBI reference rates for Feb 17-20. Two transactions show rates within normal range but one hotel sub-charge shows elevated rate. Aggregated discrepancy is GBP 1,840 across 3 items."}',
 '["Currency Exchange", "RBI Reference Rates", "Policy"]'
);

-- 10. Rohit Patel & Deepa Sharma — Cross-Employee Duplicate (DEMO CLIMAX)
INSERT INTO dashboard_reports (scenario_id, traveler_name, traveler_role, traveler_initials, destination, dates, total_amount, currency, item_count, avg_confidence, status, flag_reason, flag_severity, items, reasoning, sources) VALUES
(NULL, 'Rohit Patel', 'Business Development Lead', 'RP', 'Mumbai', 'Feb 25-26, 2026', 12400, 'INR', 1, 97, 'flagged', 'Cross-Employee Duplicate: Identical ₹12,400 dinner at Spice Route submitted by both Rohit Patel and Deepa Sharma from the same calendar event', 'HIGH',
 '[{"id":"TXN-RP-01","description":"Team dinner at Spice Route (8 pax)","amount":12400,"category":"Client Entertainment","duplicate_submitter":"Deepa Sharma","event_date":"2026-02-25"}]',
 '{"summary":"Both Rohit Patel and Deepa Sharma submitted ₹12,400 for dinner at Spice Route on Feb 25. Calendar shows a single event: \"Team Dinner — Spice Route\" with both as attendees. HR Org Chart confirms they report to different managers, so neither manager would see the other''s claim. Only cross-employee analysis catches this.","ai_reasoning":"Identical merchant, identical amount, same date. Calendar event cross-reference shows single dinner with both employees listed. HR Org Chart reveals different reporting lines — standard single-manager approval would miss this entirely."}',
 '["Transaction History", "Calendar", "HR Org Chart"]'
);

-- 11. Kavita Deshmukh — Phantom Client Dinner (Downward Re-categorization)
INSERT INTO dashboard_reports (scenario_id, traveler_name, traveler_role, traveler_initials, destination, dates, total_amount, currency, item_count, avg_confidence, status, flag_reason, flag_severity, items, reasoning, sources) VALUES
(NULL, 'Kavita Deshmukh', 'Sales Manager', 'KD', 'Pune', 'Feb 12-13, 2026', 11000, 'INR', 1, 91, 'flagged', 'Phantom Client Dinner: ₹11,000 coded as "Client Entertainment" but all 4 attendees are internal @nexgen.com employees — re-classified to Internal Team Meal', 'MEDIUM',
 '[{"id":"TXN-KD-01","description":"Dinner at Malaka Spice — 4 attendees","amount":11000,"original_category":"Client Entertainment","suggested_category":"Internal Team Meal","confidence":91,"attendees":["kavita@nexgen.com","amit@nexgen.com","sneha@nexgen.com","ravi@nexgen.com"]}]',
 '{"summary":"Kavita coded ₹11,000 dinner at Malaka Spice as Client Entertainment. CRM shows no client meetings on Feb 12. All 4 attendees in the calendar event are @nexgen.com internal employees. Re-classified from Client Entertainment (₹15,000 limit) to Internal Team Meal (₹2,000/person limit). At ₹2,750/person, this exceeds the internal meal cap by ₹750/head — ₹3,000 total overage.","ai_reasoning":"Checked attendee list against CRM contacts — zero external matches. All four emails are @nexgen.com domain. Client Entertainment category requires at least one external attendee per policy section 4.2. Downward re-categorization to Internal Team Meal, which triggers per-person limit check."}',
 '["CRM", "Calendar", "Email", "Policy"]'
);

-- 12. Arjun Rao — Conference Meal Overlap (Per Diem + Provided Meals)
INSERT INTO dashboard_reports (scenario_id, traveler_name, traveler_role, traveler_initials, destination, dates, total_amount, currency, item_count, avg_confidence, status, flag_reason, flag_severity, items, reasoning, sources) VALUES
(NULL, 'Arjun Rao', 'Technical Lead', 'AR', 'Bangalore', 'Feb 20-22, 2026', 4500, 'INR', 3, 88, 'flagged', 'Conference Meal Overlap: Per diem claimed on 3 conference days, but agenda shows lunch provided on Days 1 and 3 — only Day 2 eligible', 'MEDIUM',
 '[{"id":"TXN-AR-01","description":"Per diem Day 1 (TechSummit)","amount":1500,"category":"Meals Per Diem","date":"2026-02-20","lunch_provided":true,"eligible":false},{"id":"TXN-AR-02","description":"Per diem Day 2 (TechSummit)","amount":1500,"category":"Meals Per Diem","date":"2026-02-21","lunch_provided":false,"eligible":true},{"id":"TXN-AR-03","description":"Per diem Day 3 (TechSummit)","amount":1500,"category":"Meals Per Diem","date":"2026-02-22","lunch_provided":true,"eligible":false}]',
 '{"summary":"Arjun claimed ₹1,500/day per diem for all 3 days of TechSummit Bangalore. Conference registration email confirms lunch included on Day 1 (Feb 20) and Day 3 (Feb 22). Day 2 had no provided meals. Per policy section 6.1, per diem is reduced when meals are provided by the event. Days 1 and 3 flagged — ₹3,000 ineligible.","ai_reasoning":"Matched conference registration email to calendar event ''TechSummit Bangalore 2026''. Extracted agenda PDF attachment showing ''Lunch: 12:30-13:30'' on Day 1 and Day 3 schedules. Day 2 agenda shows ''Lunch: On your own''. Policy section 6.1 requires per diem reduction when event provides meals."}',
 '["Calendar", "Conference Agenda", "Email", "Policy"]'
);

-- ============================================================================
-- 6. DASHBOARD REPORTS — 38 Auto-Approved
-- ============================================================================

INSERT INTO dashboard_reports (scenario_id, traveler_name, traveler_role, traveler_initials, destination, dates, total_amount, currency, item_count, avg_confidence, status, flag_reason, flag_severity) VALUES
(NULL, 'Arjun Mehta',       'Account Executive',        'AM', 'Pune',       'Feb 3-4, 2026',    12500, 'INR', 3, 96, 'auto_approved', NULL, NULL),
(NULL, 'Sneha Patil',       'UX Designer',              'SP', 'Hyderabad',  'Feb 4-5, 2026',     9800, 'INR', 3, 95, 'auto_approved', NULL, NULL),
(NULL, 'Karthik Raman',     'Data Engineer',             'KR', 'Chennai',    'Feb 5-6, 2026',    11200, 'INR', 4, 94, 'auto_approved', NULL, NULL),
(NULL, 'Deepa Venkatesh',   'HR Business Partner',       'DV', 'Kolkata',    'Feb 6-7, 2026',    15300, 'INR', 4, 97, 'auto_approved', NULL, NULL),
(NULL, 'Rohan Gupta',       'Solutions Engineer',        'RG', 'Jaipur',     'Feb 7-8, 2026',     8900, 'INR', 3, 93, 'auto_approved', NULL, NULL),
(NULL, 'Aisha Khan',        'Content Strategist',        'AK', 'Mumbai',     'Feb 8-9, 2026',    22100, 'INR', 5, 96, 'auto_approved', NULL, NULL),
(NULL, 'Vivek Sharma',      'Backend Developer',         'VS', 'Bangalore',  'Feb 9-10, 2026',   14700, 'INR', 3, 92, 'auto_approved', NULL, NULL),
(NULL, 'Priya Menon',       'Product Analyst',           'PM', 'Pune',       'Feb 10-11, 2026',  10400, 'INR', 3, 95, 'auto_approved', NULL, NULL),
(NULL, 'Suresh Reddy',      'DevOps Engineer',           'SR', 'Hyderabad',  'Feb 11-12, 2026',  13200, 'INR', 4, 94, 'auto_approved', NULL, NULL),
(NULL, 'Neha Agarwal',      'Finance Analyst',           'NA', 'Delhi',      'Feb 12-13, 2026',  18500, 'INR', 5, 97, 'auto_approved', NULL, NULL),
(NULL, 'Amit Patel',        'Sales Manager',             'AP', 'Ahmedabad',  'Feb 12-14, 2026',  16800, 'INR', 4, 93, 'auto_approved', NULL, NULL),
(NULL, 'Divya Krishnan',    'QA Lead',                   'DK', 'Chennai',    'Feb 13-14, 2026',  11900, 'INR', 3, 96, 'auto_approved', NULL, NULL),
(NULL, 'Ravi Shankar',      'Infrastructure Engineer',   'RS', 'Bangalore',  'Feb 14-15, 2026',  13600, 'INR', 4, 95, 'auto_approved', NULL, NULL),
(NULL, 'Meera Joshi',       'Brand Manager',             'MJ', 'Mumbai',     'Feb 15-16, 2026',  21300, 'INR', 5, 98, 'auto_approved', NULL, NULL),
(NULL, 'Siddharth Nair',    'Cloud Architect',           'SN', 'Pune',       'Feb 16-17, 2026',  12100, 'INR', 3, 94, 'auto_approved', NULL, NULL),
(NULL, 'Anjali Bhat',       'Legal Counsel',             'AB', 'Delhi',      'Feb 17-18, 2026',  17200, 'INR', 4, 96, 'auto_approved', NULL, NULL),
(NULL, 'Gaurav Singh',      'Customer Success Manager',  'GS', 'Lucknow',    'Feb 17-19, 2026',  14500, 'INR', 4, 93, 'auto_approved', NULL, NULL),
(NULL, 'Pooja Rawat',       'Frontend Developer',        'PR', 'Chandigarh', 'Feb 18-19, 2026',   7800, 'INR', 3, 95, 'auto_approved', NULL, NULL),
(NULL, 'Manish Kumar',      'Supply Chain Analyst',      'MK', 'Kolkata',    'Feb 19-20, 2026',  13900, 'INR', 4, 92, 'auto_approved', NULL, NULL),
(NULL, 'Lakshmi Iyer',      'Talent Acquisition Lead',   'LI', 'Bangalore',  'Feb 20-21, 2026',  15100, 'INR', 4, 97, 'auto_approved', NULL, NULL),
(NULL, 'Rajesh Pillai',     'Security Engineer',         'RP', 'Hyderabad',  'Feb 20-22, 2026',  16400, 'INR', 5, 94, 'auto_approved', NULL, NULL),
(NULL, 'Tanvi Deshmukh',    'Operations Manager',        'TD', 'Pune',       'Feb 21-22, 2026',  11700, 'INR', 3, 96, 'auto_approved', NULL, NULL),
(NULL, 'Vikram Batra',      'Technical Writer',          'VB', 'Jaipur',     'Feb 21-23, 2026',   9200, 'INR', 3, 93, 'auto_approved', NULL, NULL),
(NULL, 'Nandini Rao',       'Data Scientist',            'NR', 'Chennai',    'Feb 22-23, 2026',  12800, 'INR', 4, 95, 'auto_approved', NULL, NULL),
(NULL, 'Harsh Vardhan',     'Platform Engineer',         'HV', 'Mumbai',     'Feb 23-24, 2026',  19600, 'INR', 5, 98, 'auto_approved', NULL, NULL),
(NULL, 'Swati Kulkarni',    'Business Development Rep',  'SK', 'Bangalore',  'Feb 23-25, 2026',  17300, 'INR', 4, 94, 'auto_approved', NULL, NULL),
(NULL, 'Aditya Mishra',     'ML Engineer',               'AM', 'Delhi',      'Feb 24-25, 2026',  16100, 'INR', 4, 96, 'auto_approved', NULL, NULL),
(NULL, 'Rekha Sundaram',    'Compliance Officer',        'RS', 'Mumbai',     'Feb 24-26, 2026',  20800, 'INR', 5, 97, 'auto_approved', NULL, NULL),
(NULL, 'Pranav Chopra',     'SRE',                       'PC', 'Hyderabad',  'Feb 25-26, 2026',  10900, 'INR', 3, 93, 'auto_approved', NULL, NULL),
(NULL, 'Ishita Sen',        'Product Designer',          'IS', 'Kolkata',    'Feb 25-27, 2026',  14200, 'INR', 4, 95, 'auto_approved', NULL, NULL),
(NULL, 'Ajay Thakur',       'Regional Sales Manager',    'AT', 'Ahmedabad',  'Feb 26-27, 2026',  13500, 'INR', 3, 94, 'auto_approved', NULL, NULL),
(NULL, 'Kavita Nambiar',    'Training Manager',          'KN', 'Chennai',    'Feb 26-28, 2026',  15800, 'INR', 4, 96, 'auto_approved', NULL, NULL),
(NULL, 'Nikhil Jain',       'Procurement Specialist',    'NJ', 'Pune',       'Feb 27-28, 2026',   9500, 'INR', 3, 92, 'auto_approved', NULL, NULL),
(NULL, 'Radhika Goel',      'Research Analyst',          'RG', 'Delhi',      'Feb 27-28, 2026',  16700, 'INR', 4, 97, 'auto_approved', NULL, NULL),
-- International auto-approved
(NULL, 'Sameer Khanna',     'VP Engineering',            'SK', 'Singapore',  'Feb 10-13, 2026', 145000, 'INR', 6, 96, 'auto_approved', NULL, NULL),
(NULL, 'Ananya Pillai',     'Global Accounts Director',  'AP', 'Dubai',      'Feb 14-17, 2026', 128000, 'INR', 5, 94, 'auto_approved', NULL, NULL),
(NULL, 'Rahul Verma',       'CTO Office',                'RV', 'San Francisco', 'Feb 18-22, 2026', 320000, 'INR', 7, 95, 'auto_approved', NULL, NULL),
(NULL, 'Sunita Mohan',      'Partner Manager',           'SM', 'Tokyo',      'Feb 20-23, 2026', 195000, 'INR', 6, 93, 'auto_approved', NULL, NULL);

-- ============================================================================
-- 7. FALLBACKS — Mumbai Trip
-- ============================================================================

-- 7a. Assembly fallback
INSERT INTO fallbacks (id, scenario_id, type, response, text) VALUES (
  'mumbai-trip/assembly',
  'mumbai-trip',
  'assembly',
  '{
    "scenario_id": "mumbai-trip",
    "trip_id": "TRIP-2026-0224-TS",
    "traveler": {
      "name": "Tanya Sharma",
      "employee_id": "NXG-4521",
      "email": "tanya@nexgen.demo",
      "department": "Enterprise Sales",
      "cost_center": "CC-ENT-WEST-2026",
      "grade": "L5",
      "approver": "Mihir Desai"
    },
    "trip": {
      "destination": "Mumbai",
      "dates": "Feb 24-26, 2026",
      "type": "domestic",
      "purpose": "Client visit — Reliance Industries quarterly business review",
      "pre_approval": {
        "id": "PA-2026-0218-TS",
        "budget": 50000,
        "approved_by": "Mihir Desai",
        "approved_date": "2026-02-18"
      }
    },
    "items": [
      {
        "id": "TXN-001",
        "description": "IndiGo 6E-2145 BLR→BOM",
        "date": "2026-02-24",
        "amount": 4850,
        "currency": "INR",
        "category": "Flights",
        "original_category": "Airlines",
        "payment_method": "corporate_card",
        "status": "compliant",
        "confidence": 98,
        "has_receipt": true,
        "policy_check": {
          "within_limit": true,
          "applicable_rule": "Economy flights under 4 hours",
          "limit": null
        },
        "sources": ["Email (PNR: ABC123)", "Booking System"]
      },
      {
        "id": "TXN-002",
        "description": "Taj Lands End (2 nights)",
        "date": "2026-02-24",
        "amount": 18400,
        "currency": "INR",
        "category": "Accommodation",
        "original_category": "Hotels",
        "payment_method": "corporate_card",
        "status": "compliant",
        "confidence": 97,
        "has_receipt": true,
        "policy_check": {
          "within_limit": true,
          "applicable_rule": "Mumbai Tier 1: ₹12,000/night",
          "limit": 24000,
          "nights": 2,
          "per_night": 9200
        },
        "sources": ["Email (Confirmation: TAJ-98765)", "Booking System"]
      },
      {
        "id": "TXN-003",
        "description": "Uber Airport→Hotel",
        "date": "2026-02-24",
        "amount": 780,
        "currency": "INR",
        "category": "Airport Transfer",
        "original_category": "Transportation",
        "payment_method": "corporate_card",
        "status": "compliant",
        "confidence": 96,
        "has_receipt": true,
        "policy_check": {
          "within_limit": true,
          "applicable_rule": "Airport transfer: ₹2,000 max",
          "limit": 2000
        },
        "sources": ["Uber Receipt"]
      },
      {
        "id": "TXN-004",
        "description": "Dinner at Trishna — Client Entertainment",
        "date": "2026-02-25",
        "amount": 8500,
        "currency": "INR",
        "category": "Client Entertainment",
        "original_category": "Restaurants",
        "payment_method": "corporate_card",
        "status": "re-categorized",
        "confidence": 94,
        "has_receipt": true,
        "policy_check": {
          "within_limit": true,
          "applicable_rule": "Client entertainment: ₹15,000/event",
          "limit": 15000
        },
        "re_categorization": {
          "from": "Restaurants",
          "to": "Client Entertainment",
          "reason": "Calendar shows Client Dinner with Vikram Mehta (Reliance VP Procurement) at Trishna on Feb 25, 19:00. CRM confirms active deal RLN-2026-Q1 (₹2Cr, Negotiation stage). Re-categorized for accurate cost allocation.",
          "evidence": ["Calendar: Client Dinner - Reliance Team @ Trishna, 19:00", "CRM: Deal RLN-2026-Q1, Vikram Mehta, VP Procurement", "Policy: Within ₹15,000 client entertainment limit"]
        },
        "sources": ["Calendar", "CRM", "Policy"]
      },
      {
        "id": "TXN-005",
        "description": "Uber to Reliance Office",
        "date": "2026-02-25",
        "amount": 350,
        "currency": "INR",
        "category": "Local Transport",
        "original_category": "Transportation",
        "payment_method": "corporate_card",
        "status": "compliant",
        "confidence": 95,
        "has_receipt": true,
        "policy_check": {
          "within_limit": true,
          "applicable_rule": "Local transport: ₹3,000/day",
          "limit": 3000
        },
        "sources": ["Uber Receipt", "Calendar (Meeting at Reliance Corporate Park)"]
      },
      {
        "id": "TXN-006",
        "description": "IndiGo BOM→BLR",
        "date": "2026-02-26",
        "amount": 5200,
        "currency": "INR",
        "category": "Flights",
        "original_category": "Airlines",
        "payment_method": "corporate_card",
        "status": "compliant",
        "confidence": 97,
        "has_receipt": true,
        "policy_check": {
          "within_limit": true,
          "applicable_rule": "Economy flights under 4 hours",
          "limit": null
        },
        "sources": ["Booking System"]
      },
      {
        "id": "TXN-007",
        "description": "Local taxi — Gap Detected",
        "date": "2026-02-25",
        "amount": 1200,
        "currency": "INR",
        "category": "Local Transport",
        "original_category": "Transportation",
        "payment_method": "cash",
        "status": "gap_detected",
        "confidence": 72,
        "has_receipt": false,
        "policy_check": {
          "within_limit": true,
          "applicable_rule": "No-receipt limit: ₹1,500",
          "limit": 1500
        },
        "gap_detection": {
          "type": "missing_transport",
          "reason": "Calendar shows meeting at Reliance Corporate Park (Ghansoli) ending ~12:00 and Client Dinner at Trishna (Fort) at 19:00. No transport transaction found for this 25km journey. Cash taxi detected via gap analysis.",
          "from_location": "Reliance Corporate Park, Ghansoli",
          "to_location": "Hotel / Trishna Restaurant, Fort",
          "estimated_distance_km": 25,
          "needs_confirmation": true
        },
        "sources": ["Calendar", "Gap Analysis"]
      }
    ],
    "summary": {
      "total_amount": 39280,
      "currency": "INR",
      "item_count": 7,
      "budget": 50000,
      "budget_remaining": 10720,
      "budget_utilization_pct": 78.6,
      "compliant_count": 5,
      "re_categorized_count": 1,
      "gap_detected_count": 1,
      "flagged_count": 0,
      "avg_confidence": 92.7,
      "needs_action": ["TXN-007: Confirm taxi amount and provide details"]
    },
    "hero_insights": [
      {
        "type": "re_categorization",
        "title": "Smart Re-categorization",
        "description": "Dinner at Trishna (₹8,500) re-categorized from Restaurants → Client Entertainment. Calendar confirms client dinner with Vikram Mehta (Reliance). CRM shows active ₹2Cr deal in Negotiation. This ensures accurate cost center allocation and is within the ₹15,000 client entertainment policy limit.",
        "item_id": "TXN-004",
        "confidence": 94
      },
      {
        "type": "gap_detection",
        "title": "Missing Transport Detected",
        "description": "No transport found between Reliance Corporate Park (Ghansoli) and Trishna Restaurant (Fort) on Feb 25 — a 25km journey. A ₹1,200 cash taxi has been detected. Please confirm the amount and details.",
        "item_id": "TXN-007",
        "confidence": 72
      }
    ]
  }',
  NULL
);

-- 7b. Chat initial message
INSERT INTO fallbacks (id, scenario_id, type, response, text) VALUES (
  'mumbai-trip/chat-initial',
  'mumbai-trip',
  'chat',
  '{
    "role": "assistant",
    "scenario_id": "mumbai-trip",
    "actions": [
      {"type": "show_table", "data": "items"},
      {"type": "highlight", "item_id": "TXN-004", "reason": "re_categorization"},
      {"type": "highlight", "item_id": "TXN-007", "reason": "gap_detected"},
      {"type": "prompt_confirmation", "item_id": "TXN-007", "question": "I detected a gap — did you take a taxi from Ghansoli to Fort on Feb 25? What was the actual fare?"}
    ]
  }',
  'Hi Tanya! I''ve assembled your Mumbai trip report (Feb 24-26). Here''s what I found:

| # | Item | Amount | Category | Status |
|---|------|--------|----------|--------|
| 1 | IndiGo 6E-2145 BLR→BOM | ₹4,850 | Flights | ✅ Compliant |
| 2 | Taj Lands End (2 nights) | ₹18,400 | Accommodation | ✅ Compliant |
| 3 | Uber Airport→Hotel | ₹780 | Airport Transfer | ✅ Compliant |
| 4 | Dinner at Trishna | ₹8,500 | **Client Entertainment** | 🔄 Re-categorized |
| 5 | Uber to Reliance Office | ₹350 | Local Transport | ✅ Compliant |
| 6 | IndiGo BOM→BLR | ₹5,200 | Flights | ✅ Compliant |
| 7 | Local taxi (detected) | ₹1,200 | Local Transport | 🔍 Gap Detected |

**Total: ₹39,280** of ₹50,000 budget (78.6% utilized)

**Two things to note:**

🔄 **Dinner Re-categorized:** Your ₹8,500 dinner at Trishna was moved from "Restaurants" to **Client Entertainment**. I found a calendar event for "Client Dinner - Reliance Team" at 7 PM with Vikram Mehta, and your CRM shows the active Reliance deal (₹2Cr, Negotiation stage). This is well within the ₹15,000 client entertainment limit.

🔍 **Gap Detected:** I noticed there''s no transport between your meeting at Reliance Corporate Park (Ghansoli) and dinner at Trishna (Fort) — that''s about 25 km. I found a ₹1,200 cash taxi transaction. **Did you take this taxi? What was the actual fare?**'
);

-- 7c. Chat confirm taxi response
INSERT INTO fallbacks (id, scenario_id, type, response, text) VALUES (
  'mumbai-trip/chat-confirm-taxi',
  'mumbai-trip',
  'chat',
  '{
    "role": "assistant",
    "scenario_id": "mumbai-trip",
    "actions": [
      {"type": "update_item", "item_id": "TXN-007", "updates": {"amount": 1100, "status": "confirmed", "confidence": 95, "has_receipt": false, "notes": "Employee confirmed: ₹1,100 cash taxi, no receipt"}},
      {"type": "update_summary", "updates": {"total_amount": 39180, "budget_remaining": 10820, "budget_utilization_pct": 78.4, "gap_detected_count": 0, "needs_action": []}}
    ]
  }',
  'Got it! I''ve updated the taxi to **₹1,100** (cash, no receipt). That''s within the ₹1,500 no-receipt policy limit, so you''re all good.

Your updated total is **₹39,180** — well within the ₹50,000 budget with ₹10,820 remaining.

All 7 items are now accounted for. Would you like to submit this report to Mihir Desai for approval?'
);

-- 7d. Chat submit confirmation
INSERT INTO fallbacks (id, scenario_id, type, response, text) VALUES (
  'mumbai-trip/chat-submit',
  'mumbai-trip',
  'chat',
  '{
    "role": "assistant",
    "scenario_id": "mumbai-trip",
    "actions": [
      {"type": "submit_report", "report_id": "RPT-2026-0226-TS", "approver": "Mihir Desai", "status": "submitted"},
      {"type": "create_audit_entry", "event": "report_submitted", "details": {"report_id": "RPT-2026-0226-TS", "total": 39180, "items": 7}}
    ]
  }',
  'Your expense report has been submitted! 🎉

**Report Summary:**
- **Report ID:** RPT-2026-0226-TS
- **Trip:** Mumbai Client Visit (Feb 24-26)
- **Total:** ₹39,180
- **Items:** 7 (5 compliant, 1 re-categorized, 1 confirmed)
- **Approver:** Mihir Desai

Mihir will be notified and can review the report in his dashboard. The AI-assisted re-categorization and gap detection will be highlighted for his review.

Is there anything else you need help with?'
);

-- 7e. Chat why category explanation
INSERT INTO fallbacks (id, scenario_id, type, response, text) VALUES (
  'mumbai-trip/chat-why-category',
  'mumbai-trip',
  'chat',
  '{
    "role": "assistant",
    "scenario_id": "mumbai-trip",
    "actions": [
      {"type": "show_evidence", "item_id": "TXN-004", "sources": ["Calendar", "CRM", "Policy"]}
    ]
  }',
  'Great question! Here''s exactly why I re-categorized your Trishna dinner:

**From:** Restaurants → **To:** Client Entertainment

**Evidence I cross-referenced:**

1. **Calendar:** You had "Client Dinner - Reliance Team" scheduled at Trishna Restaurant, Fort at 7:00 PM on Feb 25. Attendees: you + Vikram Mehta.

2. **CRM:** Vikram Mehta is the VP Procurement at Reliance Industries. There''s an active deal — "NexGen Platform Enterprise License" (Deal ID: RLN-2026-Q1) worth ₹2 Crore, currently in Negotiation stage with 65% probability and expected close by April 30.

3. **Policy:** Client entertainment is allowed up to ₹15,000/event for domestic trips. Your ₹8,500 dinner is well within this limit.

**Why it matters:** "Restaurants" expenses come from your daily meal allowance (₹5,000/day). "Client Entertainment" has a separate, higher budget and gets allocated to the deal''s cost center. This re-categorization means:
- Your meal allowance stays intact for other meals
- The expense is correctly attributed to the Reliance deal
- Finance gets accurate client acquisition cost data

**Confidence: 94%** — The calendar + CRM match is very strong. The 6% uncertainty is because the transaction time (19:15) is 15 minutes after the calendar event (19:00), which is normal for restaurant billing.'
);

-- 7f. Chat policy question
INSERT INTO fallbacks (id, scenario_id, type, response, text) VALUES (
  'mumbai-trip/chat-policy-question',
  'mumbai-trip',
  'chat',
  '{
    "role": "assistant",
    "scenario_id": "mumbai-trip",
    "actions": [
      {"type": "show_policy", "policy_id": "nexgen-v4.2", "section": "domestic"}
    ]
  }',
  'Here are the NexGen Travel Policy (v4.2) limits that apply to your Mumbai trip:

**✈️ Flights:**
- Economy class for flights under 4 hours (your BLR↔BOM flights qualify)
- Business class available for L6+ on flights over 4 hours

**🏨 Accommodation:**
- Mumbai (Tier 1 city): **₹12,000/night**
- Your Taj Lands End: ₹9,200/night (2 nights = ₹18,400) — ✅ within limit

**🍽️ Meals:**
- Standard: **₹5,000/day**
- Team meals: ₹2,000/person
- Client entertainment: **₹15,000/event**
- Your Trishna dinner (₹8,500) is filed under Client Entertainment — ✅ within limit

**🚗 Transport:**
- Airport transfers: **₹2,000** per trip
- Local transport: **₹3,000/day**
- No-receipt maximum: **₹1,500**
- Your cash taxi (₹1,100, no receipt) — ✅ within no-receipt limit

**📋 General:**
- Receipts required for expenses over **₹500**
- Trip ceiling: **₹50,000**
- Your total (₹39,180) uses 78.4% of the ceiling

All your expenses are within policy! Let me know if you have questions about any specific limit.'
);
