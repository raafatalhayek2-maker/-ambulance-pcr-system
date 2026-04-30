-- PCR Pilot — DEMO seed data. ALL NAMES ARE OBVIOUSLY-FAKE.
-- Run AFTER 0001_init.sql.

-- Users (demo passwords are plaintext for the live demo only)
INSERT INTO users (id, username, password, role, full_name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'emt1', 'demo123', 'emt',        'David Demo (EMT)'),
  ('22222222-2222-2222-2222-222222222222', 'emt2', 'demo123', 'emt',        'Raafat Sample (EMT)'),
  ('33333333-3333-3333-3333-333333333333', 'sup1', 'demo123', 'supervisor', 'Sam Supervisor');

-- Sample PCRs — populated supervisor dashboard
INSERT INTO pcrs (
  id, emt_id, trip_type, status,
  patient_name, dob, age, mrn, insurance,
  pickup_facility, pickup_address, pickup_lat, pickup_lng, pickup_time,
  destination_facility, destination_address, destination_lat, destination_lng, dropoff_time,
  mileage, reason_for_transport, diagnosis,
  patient_condition, chief_complaint, assessment, mental_status, mobility_status,
  vitals, interventions, transport_narrative, transfer_of_care,
  crew_notes, generated_narrative,
  patient_signature_done, crew_signature_done,
  created_at, reviewed_at, reviewed_by
) VALUES
  -- Completed #1
  ('aaaaaaa1-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111',
   'Hospital Discharge', 'Completed',
   'John Demo', '1948-04-12', '77', 'MRN-DEMO-001', 'Medicare (DEMO)',
   'Sample General Hospital', '100 Sample St, Demo City, NY 10001', 40.7484, -73.9857, '2026-04-25 10:15',
   'Sunset Demo Nursing Home',  '250 Sunset Ave, Demo City, NY 10002', 40.7138, -74.0060, '2026-04-25 11:05',
   8.4, 'Hospital discharge to nursing facility', 'CHF, stable',
   'Stable, alert', 'Routine discharge', 'No acute distress', 'A&Ox4', 'Bed-confined',
   'BP 128/82, HR 78, SpO2 97% RA', 'O2 NC at 2L during transport (sample)',
   'Patient transported supine on stretcher.', 'Care transferred to RN at receiving facility.',
   'Uneventful transport.', '',
   true, true,
   '2026-04-25 09:50', '2026-04-25 13:00', '33333333-3333-3333-3333-333333333333'),

  -- Completed #2
  ('aaaaaaa1-0000-0000-0000-000000000002',
   '22222222-2222-2222-2222-222222222222',
   'Dialysis Transport', 'Completed',
   'Jane Sample', '1955-09-30', '70', 'MRN-DEMO-002', 'Medicaid (DEMO)',
   'Demo Dialysis Clinic', '17 Clinic Rd, Demo City, NY 10010', 40.7409, -74.0010, '2026-04-26 07:30',
   'Demo Senior Living',    '99 Maple Ln, Demo City, NY 10011',     40.7320, -74.0010, '2026-04-26 08:15',
   4.2, 'Return from outpatient dialysis', 'ESRD on HD',
   'Tolerated dialysis well', 'Routine return', 'No complaints', 'A&Ox4', 'Wheelchair',
   'BP 132/76, HR 82, SpO2 98% RA', 'No interventions documented',
   'Patient ambulated to stretcher with assistance.', 'Care transferred to facility nurse.',
   '', '',
   true, true,
   '2026-04-26 07:10', '2026-04-26 12:00', '33333333-3333-3333-3333-333333333333'),

  -- Completed #3
  ('aaaaaaa1-0000-0000-0000-000000000003',
   '11111111-1111-1111-1111-111111111111',
   'Routine Medical Transport', 'Completed',
   'Robert Test', '1962-01-22', '63', 'MRN-DEMO-003', 'BCBS (DEMO)',
   'Demo Outpatient Center', '500 Demo Blvd, Demo City, NY 10003', 40.7580, -73.9855, '2026-04-27 13:00',
   'Patient Home (Sample)',  '12 Sample Court, Demo City, NY 10004', 40.7295, -73.9965, '2026-04-27 13:55',
   6.1, 'Return home after MRI', 'Lumbar pain, chronic',
   'Comfortable', 'Routine transport home', 'No acute issues', 'A&Ox4', 'Stretcher',
   'BP 124/74, HR 70, SpO2 99% RA', 'No interventions documented',
   'Patient transported supine.', 'Care transferred to home health aide present at residence.',
   '', '',
   true, true,
   '2026-04-27 12:40', '2026-04-27 15:30', '33333333-3333-3333-3333-333333333333'),

  -- Pending Review
  ('aaaaaaa1-0000-0000-0000-000000000004',
   '22222222-2222-2222-2222-222222222222',
   'BLS Transport', 'Pending Review',
   'Maria Mock', '1971-07-04', '54', 'MRN-DEMO-004', 'Aetna (DEMO)',
   'Demo Urgent Care',     '8 Urgent Way, Demo City, NY 10005', 40.7510, -73.9760, '2026-04-28 16:00',
   'Sample General Hospital','100 Sample St, Demo City, NY 10001', 40.7484, -73.9857, '2026-04-28 16:35',
   3.5, 'Evaluation of abdominal pain', 'Abdominal pain, R/O appendicitis',
   'Mild distress', 'Abdominal pain x 2 days', 'Tender RLQ on exam', 'A&Ox4', 'Ambulatory with assistance',
   'BP 140/88, HR 96, SpO2 98% RA', 'IV NS established en route (sample)',
   'Patient transported in semi-Fowler position.', 'Care transferred to ED triage RN.',
   'Patient anxious during transport.', '',
   true, true,
   '2026-04-28 15:50', NULL, NULL),

  -- Missing Info
  ('aaaaaaa1-0000-0000-0000-000000000005',
   '11111111-1111-1111-1111-111111111111',
   'Non-Emergency', 'Missing Info',
   'Alex Placeholder', '1980-12-15', '45', 'MRN-DEMO-005', 'United (DEMO)',
   'Demo Imaging Center', '40 Imaging Pl, Demo City, NY 10006', 40.7400, -73.9900, '2026-04-29 09:00',
   'Patient Home (Sample)','77 Placeholder Rd, Demo City, NY 10007', 40.7350, -73.9920, NULL,
   NULL, 'Return after imaging study', 'Knee pain post-op',
   'Comfortable', 'Routine return', 'Stable', 'A&Ox4', 'Wheelchair',
   'Vitals not provided', 'No interventions documented',
   '', 'Transfer of care not documented',
   '', '',
   false, true,
   '2026-04-29 08:45', NULL, NULL);

-- Audit log seed
INSERT INTO audit_log (pcr_id, user_id, action) VALUES
  ('aaaaaaa1-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'reviewed'),
  ('aaaaaaa1-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'reviewed'),
  ('aaaaaaa1-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', 'reviewed');
