-- ============================================
-- AROGYASEVA HMS - Database Seed Data
-- database/seed.sql
--
-- HOW TO RUN:
-- Option 1: psql terminal
--   psql -U hms_user -d arogyaseva_hms -f seed.sql
--
-- Option 2: pgAdmin
--   Open pgAdmin → arogyaseva_hms database
--   Click Query Tool → paste this file → Run
--
-- Option 3: VS Code PostgreSQL extension
--   Open this file → right click → Run Query
--
-- NOTE: Run AFTER prisma migrate dev
-- All passwords are hashed with bcrypt rounds=12
-- Plain passwords for testing are written in comments
-- ============================================

-- Clear existing data (safe reset for development)
-- Remove this block if you don't want to reset
TRUNCATE TABLE
  "BloodInventory",
  "BloodDonor",
  "Ambulance",
  "Medicine",
  "PatientSettings",
  "DoctorSettings",
  "StaffSettings",
  "Staff",
  "Doctor",
  "Patient",
  "Department",
  "HospitalSettings"
CASCADE;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. HOSPITAL SETTINGS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSERT INTO "HospitalSettings" (
  id, "hospitalName", address, phone, email,
  "registrationNo", "emergencyPhone", "workingHours",
  "updatedAt"
) VALUES (
  'default-hospital-id',
  'ArogyaSeva Medical Centre',
  '123, Health Street, Bengaluru, Karnataka - 560001',
  '080-12345678',
  'info@arogyaseva.in',
  'KA-HOSP-2020-001',
  '1800-123-4567',
  '8:00 AM – 10:00 PM (Emergency 24x7)',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. DEPARTMENTS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSERT INTO "Department" (id, name, floor, "totalBeds", "isActive", "createdAt") VALUES
  ('dept-card', 'Cardiology',   3, 20, true, NOW()),
  ('dept-neur', 'Neurology',    4, 15, true, NOW()),
  ('dept-orth', 'Orthopedics',  2, 18, true, NOW()),
  ('dept-peds', 'Pediatrics',   1, 25, true, NOW()),
  ('dept-icu',  'ICU',          5, 10, true, NOW()),
  ('dept-emrg', 'Emergency',    0, 15, true, NOW()),
  ('dept-phar', 'Pharmacy',     0,  0, true, NOW()),
  ('dept-lab',  'Laboratory',   1,  0, true, NOW()),
  ('dept-opd',  'OPD',          1,  0, true, NOW()),
  ('dept-genw', 'General Ward', 2, 30, true, NOW())
ON CONFLICT (name) DO NOTHING;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 3. ROOMS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSERT INTO "Room" (id, "roomNumber", floor, "departmentId", type, "isActive") VALUES
  -- General Ward
  ('room-g1', 'G-101', 2, 'dept-genw', 'general', true),
  ('room-g2', 'G-102', 2, 'dept-genw', 'general', true),
  ('room-g3', 'G-103', 2, 'dept-genw', 'general', true),
  -- Private Rooms
  ('room-p1', 'P-201', 2, 'dept-genw', 'private', true),
  ('room-p2', 'P-202', 2, 'dept-genw', 'private', true),
  -- ICU
  ('room-i1', 'ICU-01', 5, 'dept-icu', 'icu', true),
  ('room-i2', 'ICU-02', 5, 'dept-icu', 'icu', true),
  -- Emergency
  ('room-e1', 'ER-01', 0, 'dept-emrg', 'emergency', true),
  ('room-e2', 'ER-02', 0, 'dept-emrg', 'emergency', true),
  -- Cardiology
  ('room-c1', 'C-301', 3, 'dept-card', 'general', true),
  ('room-c2', 'C-302', 3, 'dept-card', 'general', true)
ON CONFLICT ("roomNumber") DO NOTHING;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 4. BEDS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSERT INTO "Bed" (id, "bedNumber", "roomId", status) VALUES
  -- General Ward G-101
  ('bed-g101-1', 'G-101-A', 'room-g1', 'available'),
  ('bed-g101-2', 'G-101-B', 'room-g1', 'occupied'),
  ('bed-g101-3', 'G-101-C', 'room-g1', 'available'),
  ('bed-g101-4', 'G-101-D', 'room-g1', 'reserved'),
  -- General Ward G-102
  ('bed-g102-1', 'G-102-A', 'room-g2', 'available'),
  ('bed-g102-2', 'G-102-B', 'room-g2', 'available'),
  -- Private P-201
  ('bed-p201-1', 'P-201',   'room-p1', 'occupied'),
  -- Private P-202
  ('bed-p202-1', 'P-202',   'room-p2', 'available'),
  -- ICU
  ('bed-icu01-1', 'ICU-01-A', 'room-i1', 'occupied'),
  ('bed-icu01-2', 'ICU-01-B', 'room-i1', 'available'),
  ('bed-icu02-1', 'ICU-02-A', 'room-i2', 'available'),
  -- Emergency
  ('bed-er01-1', 'ER-01-A', 'room-e1', 'available'),
  ('bed-er01-2', 'ER-01-B', 'room-e1', 'available'),
  -- Cardiology
  ('bed-c301-1', 'C-301-A', 'room-c1', 'available'),
  ('bed-c301-2', 'C-301-B', 'room-c1', 'occupied')
ON CONFLICT ("roomId", "bedNumber") DO NOTHING;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 5. DOCTORS
-- Password for all doctors: Doctor@123
-- bcrypt hash of 'Doctor@123' with rounds=12
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- NOTE: In real setup, use bcrypt to hash
-- The hash below is a placeholder
-- Run: node -e "const b=require('bcrypt');b.hash('Doctor@123',12).then(console.log)"
-- and replace the passwordHash values below

INSERT INTO "Doctor" (
  id, "doctorCode", "firstName", "lastName",
  specialization, qualification, "licenseNumber",
  "experienceYears", "consultationFee",
  phone, email, "passwordHash",
  "departmentId", "availableDays",
  "workStartTime", "workEndTime",
  "currentStatus", "isActive", "isDeleted",
  "joiningDate", "createdAt", "updatedAt"
) VALUES
  (
    'doc-anil-sharma',
    'DOC-2024-CARD-001',
    'Anil', 'Sharma',
    'Cardiology', 'MBBS, MD, DM Cardiology',
    'KA-MED-2010-001',
    14, 500.00,
    -- phone: 9876500001 (encrypted in real app, plain here for seed)
    decode('392e2e2e', 'hex'),  -- placeholder, replace with real encrypt
    decode('392e2e2e', 'hex'),  -- placeholder
    -- Password: Doctor@123
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMUBufSGmIh5I2z7oIXVNkSJpG',
    'dept-card',
    ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday'],
    '09:00', '17:00',
    'available', true, false,
    NOW(), NOW(), NOW()
  ),
  (
    'doc-sunita-mehta',
    'DOC-2024-NEUR-001',
    'Sunita', 'Mehta',
    'Neurology', 'MBBS, MD Neurology',
    'KA-MED-2012-002',
    12, 600.00,
    decode('392e2e2e', 'hex'),
    decode('392e2e2e', 'hex'),
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMUBufSGmIh5I2z7oIXVNkSJpG',
    'dept-neur',
    ARRAY['Monday','Wednesday','Friday'],
    '10:00', '18:00',
    'available', true, false,
    NOW(), NOW(), NOW()
  ),
  (
    'doc-rajesh-patel',
    'DOC-2024-ORTH-001',
    'Rajesh', 'Patel',
    'Orthopedics', 'MBBS, MS Orthopedics',
    'KA-MED-2013-003',
    11, 450.00,
    decode('392e2e2e', 'hex'),
    decode('392e2e2e', 'hex'),
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMUBufSGmIh5I2z7oIXVNkSJpG',
    'dept-orth',
    ARRAY['Monday','Tuesday','Thursday','Saturday'],
    '09:00', '16:00',
    'available', true, false,
    NOW(), NOW(), NOW()
  ),
  (
    'doc-meena-iyer',
    'DOC-2024-PEDS-001',
    'Meena', 'Iyer',
    'Pediatrics', 'MBBS, MD Pediatrics',
    'KA-MED-2015-004',
    9, 350.00,
    decode('392e2e2e', 'hex'),
    decode('392e2e2e', 'hex'),
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMUBufSGmIh5I2z7oIXVNkSJpG',
    'dept-peds',
    ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday'],
    '09:00', '17:00',
    'available', true, false,
    NOW(), NOW(), NOW()
  ),
  (
    'doc-arjun-reddy',
    'DOC-2024-GENL-001',
    'Arjun', 'Reddy',
    'General Medicine', 'MBBS',
    'KA-MED-2018-005',
    6, 250.00,
    decode('392e2e2e', 'hex'),
    decode('392e2e2e', 'hex'),
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMUBufSGmIh5I2z7oIXVNkSJpG',
    'dept-opd',
    ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
    '08:00', '16:00',
    'available', true, false,
    NOW(), NOW(), NOW()
  ),
  (
    'doc-kavya-nair',
    'DOC-2024-EMRG-001',
    'Kavya', 'Nair',
    'Emergency Medicine', 'MBBS, MRCP',
    'KA-MED-2016-006',
    8, 400.00,
    decode('392e2e2e', 'hex'),
    decode('392e2e2e', 'hex'),
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMUBufSGmIh5I2z7oIXVNkSJpG',
    'dept-emrg',
    ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
    '00:00', '23:59',
    'available', true, false,
    NOW(), NOW(), NOW()
  );

-- Doctor Settings
INSERT INTO "DoctorSettings" (id, "doctorId", "updatedAt") VALUES
  ('ds-1', 'doc-anil-sharma',  NOW()),
  ('ds-2', 'doc-sunita-mehta', NOW()),
  ('ds-3', 'doc-rajesh-patel', NOW()),
  ('ds-4', 'doc-meena-iyer',   NOW()),
  ('ds-5', 'doc-arjun-reddy',  NOW()),
  ('ds-6', 'doc-kavya-nair',   NOW())
ON CONFLICT ("doctorId") DO NOTHING;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 6. STAFF (Nurses, Pharmacists, Admin etc)
-- Password for all staff: Staff@123
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSERT INTO "Staff" (
  id, "staffId", "firstName", "lastName",
  role, phone, email, "passwordHash",
  "departmentId", "isActive", "isDeleted",
  "joiningDate", "createdAt", "updatedAt"
) VALUES
  -- Admin
  (
    'staff-admin-001',
    'STF-ADM-001',
    'Admin', 'User',
    'ADMIN',
    decode('392e2e2e', 'hex'),
    decode('392e2e2e', 'hex'),
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMUBufSGmIh5I2z7oIXVNkSJpG',
    NULL,
    true, false, NOW(), NOW(), NOW()
  ),
  -- Receptionist
  (
    'staff-rcp-001',
    'STF-RCP-001',
    'Lakshmi', 'Devi',
    'RECEPTIONIST',
    decode('392e2e2e', 'hex'),
    decode('392e2e2e', 'hex'),
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMUBufSGmIh5I2z7oIXVNkSJpG',
    'dept-opd',
    true, false, NOW(), NOW(), NOW()
  ),
  -- Nurse 1
  (
    'staff-nrs-001',
    'STF-NRS-001',
    'Priya', 'Sharma',
    'NURSE',
    decode('392e2e2e', 'hex'),
    decode('392e2e2e', 'hex'),
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMUBufSGmIh5I2z7oIXVNkSJpG',
    'dept-genw',
    true, false, NOW(), NOW(), NOW()
  ),
  -- Nurse 2
  (
    'staff-nrs-002',
    'STF-NRS-002',
    'Radha', 'Kumari',
    'NURSE',
    decode('392e2e2e', 'hex'),
    decode('392e2e2e', 'hex'),
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMUBufSGmIh5I2z7oIXVNkSJpG',
    'dept-icu',
    true, false, NOW(), NOW(), NOW()
  ),
  -- Pharmacist
  (
    'staff-phr-001',
    'STF-PHR-001',
    'Ravi', 'Kumar',
    'PHARMACIST',
    decode('392e2e2e', 'hex'),
    decode('392e2e2e', 'hex'),
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMUBufSGmIh5I2z7oIXVNkSJpG',
    'dept-phar',
    true, false, NOW(), NOW(), NOW()
  ),
  -- Lab Technician
  (
    'staff-lab-001',
    'STF-LAB-001',
    'Suresh', 'Babu',
    'LAB_TECHNICIAN',
    decode('392e2e2e', 'hex'),
    decode('392e2e2e', 'hex'),
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMUBufSGmIh5I2z7oIXVNkSJpG',
    'dept-lab',
    true, false, NOW(), NOW(), NOW()
  ),
  -- Accountant
  (
    'staff-acc-001',
    'STF-ACC-001',
    'Anita', 'Singh',
    'ACCOUNTANT',
    decode('392e2e2e', 'hex'),
    decode('392e2e2e', 'hex'),
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMUBufSGmIh5I2z7oIXVNkSJpG',
    NULL,
    true, false, NOW(), NOW(), NOW()
  ),
  -- Ambulance Driver
  (
    'staff-amb-001',
    'STF-AMB-001',
    'Muthu', 'Raj',
    'AMBULANCE_DRIVER',
    decode('392e2e2e', 'hex'),
    decode('392e2e2e', 'hex'),
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMUBufSGmIh5I2z7oIXVNkSJpG',
    NULL,
    true, false, NOW(), NOW(), NOW()
  ),
  -- Security Officer
  (
    'staff-sec-001',
    'STF-SEC-001',
    'Ganesh', 'Rao',
    'SECURITY_OFFICER',
    decode('392e2e2e', 'hex'),
    decode('392e2e2e', 'hex'),
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMUBufSGmIh5I2z7oIXVNkSJpG',
    NULL,
    true, false, NOW(), NOW(), NOW()
  );

-- Staff Settings
INSERT INTO "StaffSettings" (id, "staffId", "updatedAt") VALUES
  ('ss-1', 'staff-admin-001', NOW()),
  ('ss-2', 'staff-rcp-001',   NOW()),
  ('ss-3', 'staff-nrs-001',   NOW()),
  ('ss-4', 'staff-nrs-002',   NOW()),
  ('ss-5', 'staff-phr-001',   NOW()),
  ('ss-6', 'staff-lab-001',   NOW()),
  ('ss-7', 'staff-acc-001',   NOW()),
  ('ss-8', 'staff-amb-001',   NOW()),
  ('ss-9', 'staff-sec-001',   NOW())
ON CONFLICT ("staffId") DO NOTHING;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 7. PATIENTS
-- Password for all patients: Patient@123
-- NOTE: phone/email stored as BYTEA (encrypted)
-- For real encryption use the Node.js encrypt.js
-- These are placeholder bytes for seed only
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSERT INTO "Patient" (
  id, "patientId", "abhaId",
  "firstName", "lastName",
  "dateOfBirth", gender, "bloodGroup",
  phone, email,
  "passwordHash",
  allergies, "chronicConditions",
  "preferredLanguage",
  "isActive", "isDeleted",
  "createdAt", "updatedAt"
) VALUES
  (
    'pat-ramesh-kumar',
    'PAT-2024-0001',
    'ABHA-1234567890001',
    decode('52616d657368', 'hex'),   -- "Ramesh" in hex (placeholder)
    decode('4b756d6172', 'hex'),     -- "Kumar"
    '1978-05-15', 'male', 'O+',
    decode('393837363534333231300a', 'hex'),  -- phone placeholder
    decode('72616d657368406578616d706c652e636f6d', 'hex'),
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMUBufSGmIh5I2z7oIXVNkSJpG',
    ARRAY['Penicillin'],
    ARRAY['Hypertension', 'Type 2 Diabetes'],
    'en',
    true, false, NOW(), NOW()
  ),
  (
    'pat-priya-nair',
    'PAT-2024-0002',
    NULL,
    decode('5072697961', 'hex'),
    decode('4e616972', 'hex'),
    '1991-08-22', 'female', 'B+',
    decode('393837363534333231310a', 'hex'),
    decode('7072697961406578616d706c652e636f6d', 'hex'),
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMUBufSGmIh5I2z7oIXVNkSJpG',
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    'hi',
    true, false, NOW(), NOW()
  ),
  (
    'pat-suresh-reddy',
    'PAT-2024-0003',
    NULL,
    decode('537572657368', 'hex'),
    decode('5265646479', 'hex'),
    '1965-12-01', 'male', 'A-',
    decode('393837363534333231320a', 'hex'),
    decode('737572657368406578616d706c652e636f6d', 'hex'),
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMUBufSGmIh5I2z7oIXVNkSJpG',
    ARRAY['Aspirin'],
    ARRAY['Arthritis'],
    'te',
    true, false, NOW(), NOW()
  ),
  (
    'pat-kavitha-devi',
    'PAT-2024-0004',
    NULL,
    decode('4b617669746861', 'hex'),
    decode('44657669', 'hex'),
    '1995-03-18', 'female', 'AB+',
    decode('393837363534333231330a', 'hex'),
    decode('6b617669746861406578616d706c652e636f6d', 'hex'),
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMUBufSGmIh5I2z7oIXVNkSJpG',
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    'kn',
    true, false, NOW(), NOW()
  ),
  (
    'pat-mohan-singh',
    'PAT-2024-0005',
    NULL,
    decode('4d6f68616e', 'hex'),
    decode('53696e6768', 'hex'),
    '1956-07-30', 'male', 'O-',
    decode('393837363534333231340a', 'hex'),
    decode('6d6f68616e406578616d706c652e636f6d', 'hex'),
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMUBufSGmIh5I2z7oIXVNkSJpG',
    ARRAY[]::TEXT[],
    ARRAY['Cardiac History', 'Hypertension'],
    'hi',
    true, false, NOW(), NOW()
  );

-- Patient Settings
INSERT INTO "PatientSettings" (id, "patientId", "updatedAt") VALUES
  ('ps-1', 'pat-ramesh-kumar',  NOW()),
  ('ps-2', 'pat-priya-nair',    NOW()),
  ('ps-3', 'pat-suresh-reddy',  NOW()),
  ('ps-4', 'pat-kavitha-devi',  NOW()),
  ('ps-5', 'pat-mohan-singh',   NOW())
ON CONFLICT ("patientId") DO NOTHING;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 8. MEDICINES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSERT INTO "Medicine" (
  id, name, "genericName", category, unit,
  "stockUnits", "reorderLevel", "unitPrice",
  "expiryDate", manufacturer,
  "isActive", "createdAt", "updatedAt"
) VALUES
  ('med-para-500',  'Paracetamol 500mg',    'Paracetamol',           'Painkiller',  'Tablet',  450, 100,  2.50, '2026-12-31', 'Cipla',         true, NOW(), NOW()),
  ('med-amox-250',  'Amoxicillin 250mg',    'Amoxicillin',           'Antibiotic',  'Capsule',  80, 100,  8.00, '2026-06-30', 'Sun Pharma',    true, NOW(), NOW()),
  ('med-metf-500',  'Metformin 500mg',      'Metformin HCl',         'Diabetic',    'Tablet',  320, 150,  4.00, '2026-10-31', 'USV Pharma',    true, NOW(), NOW()),
  ('med-amlo-5',    'Amlodipine 5mg',       'Amlodipine Besylate',   'BP',          'Tablet',   40, 100,  6.50, '2026-08-31', 'Dr. Reddys',    true, NOW(), NOW()),
  ('med-vitd3-60k', 'Vitamin D3 60000IU',   'Cholecalciferol',       'Vitamin',     'Sachet',  190,  50, 25.00, '2027-01-31', 'Abbott India',  true, NOW(), NOW()),
  ('med-ome-20',    'Omeprazole 20mg',      'Omeprazole',            'Antacid',     'Capsule', 280,  80,  5.00, '2026-11-30', 'Torrent Pharma',true, NOW(), NOW()),
  ('med-ator-10',   'Atorvastatin 10mg',    'Atorvastatin Calcium',  'Cholesterol', 'Tablet',  160,  60, 12.00, '2026-09-30', 'Pfizer',        true, NOW(), NOW()),
  ('med-azit-500',  'Azithromycin 500mg',   'Azithromycin',          'Antibiotic',  'Tablet',   95,  80, 18.00, '2026-07-31', 'Mankind Pharma',true, NOW(), NOW()),
  ('med-ibupr-400', 'Ibuprofen 400mg',      'Ibuprofen',             'Painkiller',  'Tablet',  380, 100,  3.50, '2026-12-31', 'Cipla',         true, NOW(), NOW()),
  ('med-cete-10',   'Cetirizine 10mg',      'Cetirizine HCl',        'Antiallergic','Tablet',  220,  50,  4.50, '2027-03-31', 'GSK',           true, NOW(), NOW()),
  ('med-ins-30',    'Insulin 30IU',         'Human Insulin',         'Diabetic',    'Injection',15, 50, 180.00,'2025-09-30', 'Novo Nordisk',  true, NOW(), NOW()),
  ('med-diaz-5',    'Diazepam 5mg',         'Diazepam',              'Sedative',    'Tablet',   60,  30, 15.00, '2026-06-30', 'Roche',         true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 9. AMBULANCES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSERT INTO "Ambulance" (
  id, "vehicleNumber", "driverName", "driverPhone",
  "currentLat", "currentLng",
  status, "equipmentType",
  "isActive", "createdAt", "updatedAt"
) VALUES
  ('amb-001', 'KA-01-AA-1234', 'Ravi Kumar',  '9900001111', 12.9716, 77.5946, 'available', 'advanced', true, NOW(), NOW()),
  ('amb-002', 'KA-01-BB-5678', 'Suresh Babu', '9900002222', 12.9819, 77.6078, 'available', 'basic',    true, NOW(), NOW()),
  ('amb-003', 'KA-01-CC-9012', 'Muthu Raj',   '9900003333', 12.9631, 77.5838, 'available', 'icu',      true, NOW(), NOW()),
  ('amb-004', 'KA-01-DD-3456', 'Vijay Singh', '9900004444', 12.9752, 77.6011, 'maintenance','basic',   true, NOW(), NOW())
ON CONFLICT ("vehicleNumber") DO NOTHING;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 10. BLOOD INVENTORY
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSERT INTO "BloodInventory" (id, "bloodGroup", "unitsAvailable", "lastUpdated") VALUES
  ('bi-apos', 'A+',   8,  NOW()),
  ('bi-aneg', 'A-',   3,  NOW()),
  ('bi-bpos', 'B+',   12, NOW()),
  ('bi-bneg', 'B-',   5,  NOW()),
  ('bi-opos', 'O+',   15, NOW()),
  ('bi-oneg', 'O-',   2,  NOW()),  -- CRITICAL: below safe level
  ('bi-abpos','AB+',  6,  NOW()),
  ('bi-abneg','AB-',  4,  NOW())
ON CONFLICT ("bloodGroup") DO UPDATE SET
  "unitsAvailable" = EXCLUDED."unitsAvailable",
  "lastUpdated" = NOW();

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 11. BLOOD DONORS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSERT INTO "BloodDonor" (
  id, name, "bloodGroup", phone, city,
  latitude, longitude,
  "isAvailable", "lastDonationDate",
  "totalDonations", "isActive", "createdAt"
) VALUES
  ('donor-1', 'Vijay Kumar',    'O+', '9876501001', 'Bengaluru', 12.9716, 77.5946, true,  '2023-10-15', 5, true, NOW()),
  ('donor-2', 'Lakshmi Rao',    'B+', '9876501002', 'Mysuru',    12.2958, 76.6394, true,  '2023-08-20', 3, true, NOW()),
  ('donor-3', 'Arjun Nair',     'AB-','9876501003', 'Bengaluru', 12.9819, 77.6078, false, '2024-01-05', 7, true, NOW()),
  ('donor-4', 'Sneha Patel',    'O-', '9876501004', 'Bengaluru', 12.9631, 77.5838, true,  '2023-05-12', 9, true, NOW()),
  ('donor-5', 'Rajan Krishnan', 'A+', '9876501005', 'Bengaluru', 12.9716, 77.6010, true,  '2023-11-30', 4, true, NOW()),
  ('donor-6', 'Meera Devi',     'B-', '9876501006', 'Hubli',     15.3647, 75.1240, true,  '2023-09-18', 2, true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 12. SAMPLE APPOINTMENTS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSERT INTO "Appointment" (
  id, "patientId", "doctorId",
  "scheduledAt", type, status,
  reason, "tokenNumber",
  "isDeleted", "createdAt", "updatedAt"
) VALUES
  (
    'appt-001',
    'pat-ramesh-kumar',
    'doc-anil-sharma',
    NOW() + INTERVAL '1 hour',
    'follow-up', 'confirmed',
    'Hypertension follow-up, BP check', 1,
    false, NOW(), NOW()
  ),
  (
    'appt-002',
    'pat-priya-nair',
    'doc-sunita-mehta',
    NOW() + INTERVAL '3 hours',
    'opd', 'confirmed',
    'Severe headaches for past week', 2,
    false, NOW(), NOW()
  ),
  (
    'appt-003',
    'pat-kavitha-devi',
    'doc-meena-iyer',
    NOW() + INTERVAL '1 day',
    'opd', 'confirmed',
    'Routine health checkup', 1,
    false, NOW(), NOW()
  ),
  (
    'appt-004',
    'pat-suresh-reddy',
    'doc-rajesh-patel',
    NOW() - INTERVAL '2 days',
    'opd', 'completed',
    'Knee pain and swelling', 3,
    false, NOW(), NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 13. SAMPLE ADMISSION
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSERT INTO "Admission" (
  id, "patientId", "doctorId", "bedId",
  "admissionType", "admissionReason",
  diagnosis, "admittedAt",
  "isDeleted", "createdAt"
) VALUES
  (
    'adm-001',
    'pat-ramesh-kumar',
    'doc-anil-sharma',
    'bed-g101-2',
    'planned',
    'Hypertension management and diabetes monitoring',
    'Hypertension Stage 2, Type 2 Diabetes Mellitus',
    NOW() - INTERVAL '3 days',
    false, NOW()
  ),
  (
    'adm-002',
    'pat-mohan-singh',
    'doc-kavya-nair',
    'bed-icu01-1',
    'emergency',
    'Cardiac arrest brought via ambulance',
    'Acute Myocardial Infarction',
    NOW() - INTERVAL '1 day',
    false, NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- Update bed status after admission
UPDATE "Bed" SET status = 'occupied', "currentPatientId" = 'pat-ramesh-kumar' WHERE id = 'bed-g101-2';
UPDATE "Bed" SET status = 'occupied', "currentPatientId" = 'pat-mohan-singh'  WHERE id = 'bed-icu01-1';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 14. SAMPLE VITALS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSERT INTO "VitalsReading" (
  id, "patientId", "bedId", "admissionId",
  "heartRate", "bloodPressure", "spO2",
  temperature, "respiratoryRate", "bloodSugar",
  source, "recordedAt"
) VALUES
  ('vit-001', 'pat-ramesh-kumar', 'bed-g101-2', 'adm-001', 82,  '135/88', 97, 98.4, 16, 145.0, 'manual', NOW() - INTERVAL '2 hours'),
  ('vit-002', 'pat-ramesh-kumar', 'bed-g101-2', 'adm-001', 78,  '130/85', 98, 98.6, 15, 138.0, 'manual', NOW() - INTERVAL '1 hour'),
  ('vit-003', 'pat-mohan-singh',  'bed-icu01-1','adm-002', 45,  '165/95', 82, 99.8, 22, NULL,   'iot_device', NOW() - INTERVAL '30 minutes'),
  ('vit-004', 'pat-mohan-singh',  'bed-icu01-1','adm-002', 52,  '158/90', 85, 99.5, 20, NULL,   'iot_device', NOW() - INTERVAL '15 minutes')
ON CONFLICT (id) DO NOTHING;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 15. SAMPLE BILLS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSERT INTO "Bill" (
  id, "patientId", "admissionId",
  "totalAmount", "paidAmount", "discountAmount", "taxAmount",
  status, "paymentMethod",
  "isDeleted", "generatedAt"
) VALUES
  (
    'bill-001',
    'pat-ramesh-kumar',
    'adm-001',
    12500.00, 12500.00, 0.00, 625.00,
    'paid', 'upi',
    false, NOW() - INTERVAL '1 day'
  ),
  (
    'bill-002',
    'pat-priya-nair',
    NULL,
    3200.00, 1500.00, 0.00, 160.00,
    'partial', 'cash',
    false, NOW()
  ),
  (
    'bill-003',
    'pat-mohan-singh',
    'adm-002',
    45000.00, 0.00, 0.00, 2250.00,
    'pending', NULL,
    false, NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- Bill Items
INSERT INTO "BillItem" (id, "billId", description, category, quantity, "unitPrice", "totalPrice") VALUES
  -- Bill 001 items
  ('bi-001-1', 'bill-001', 'Room Charges - General Ward (3 days)', 'room',         3,  1000.00, 3000.00),
  ('bi-001-2', 'bill-001', 'Consultation Fee - Dr. Anil Sharma',   'consultation', 1,  500.00,   500.00),
  ('bi-001-3', 'bill-001', 'Medicines - Metformin 500mg (30 tabs)','medicine',     30,    4.00,   120.00),
  ('bi-001-4', 'bill-001', 'Nursing Charges',                      'procedure',    3,  200.00,   600.00),
  -- Bill 002 items
  ('bi-002-1', 'bill-002', 'Consultation Fee - Dr. Sunita Mehta',  'consultation', 1,  600.00,   600.00),
  ('bi-002-2', 'bill-002', 'MRI Brain Scan',                       'lab',          1, 2600.00,  2600.00),
  -- Bill 003 items
  ('bi-003-1', 'bill-003', 'ICU Charges (1 day)',                   'room',         1, 5000.00,  5000.00),
  ('bi-003-2', 'bill-003', 'Emergency Consultation',                'consultation', 1,  800.00,   800.00),
  ('bi-003-3', 'bill-003', 'Cardiac Procedure',                     'procedure',    1,35000.00, 35000.00),
  ('bi-003-4', 'bill-003', 'Medicines and IV',                      'medicine',     1, 2200.00,  2200.00),
  ('bi-003-5', 'bill-003', 'ICU Nursing',                           'procedure',    1, 2000.00,  2000.00)
ON CONFLICT (id) DO NOTHING;

-- Payment record for paid bill
INSERT INTO "Payment" (id, "billId", amount, method, "transactionId", "paidAt") VALUES
  ('pay-001', 'bill-001', 12500.00, 'upi',  'UPI-TXN-20240115-001', NOW() - INTERVAL '1 day'),
  ('pay-002', 'bill-002', 1500.00,  'cash', NULL,                    NOW())
ON CONFLICT (id) DO NOTHING;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 16. SAMPLE PRESCRIPTIONS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSERT INTO "Prescription" (
  id, "patientId", "doctorId",
  diagnosis, "isAiScanned", language,
  "expiresAt", "isDeleted", "createdAt"
) VALUES
  (
    'rx-001',
    'pat-ramesh-kumar',
    'doc-anil-sharma',
    'Hypertension Stage 2, Type 2 Diabetes Mellitus',
    false, 'en',
    NOW() + INTERVAL '30 days',
    false, NOW() - INTERVAL '2 days'
  ),
  (
    'rx-002',
    'pat-priya-nair',
    'doc-sunita-mehta',
    'Tension Headache, Vitamin D Deficiency',
    true, 'hi',
    NOW() + INTERVAL '30 days',
    false, NOW() - INTERVAL '1 day'
  )
ON CONFLICT (id) DO NOTHING;

-- Prescription Medicines
INSERT INTO "PrescriptionMedicine" (
  id, "prescriptionId", "medicineName", "genericName",
  dosage, frequency, timing, "durationDays",
  purpose, "sideEffects", "medicineId"
) VALUES
  ('rxm-001-1', 'rx-001', 'Metformin 500mg',  'Metformin HCl',       '500mg', 'Twice daily', 'After meals',   30, 'Controls blood sugar in Type 2 Diabetes',         'Nausea initially',           'med-metf-500'),
  ('rxm-001-2', 'rx-001', 'Amlodipine 5mg',   'Amlodipine Besylate', '5mg',   'Once daily',  'Morning',       30, 'Lowers blood pressure by relaxing blood vessels', 'Ankle swelling possible',    'med-amlo-5'),
  ('rxm-001-3', 'rx-001', 'Atorvastatin 10mg','Atorvastatin',        '10mg',  'Once daily',  'Night',         30, 'Reduces cholesterol levels',                      'Muscle pain rarely',         'med-ator-10'),
  ('rxm-002-1', 'rx-002', 'Paracetamol 500mg','Paracetamol',         '500mg', 'Three times', 'After meals',   5,  'Pain and fever relief',                           'Usually well tolerated',     'med-para-500'),
  ('rxm-002-2', 'rx-002', 'Vitamin D3 60000IU','Cholecalciferol',    '60000IU','Once weekly', 'After breakfast',12, 'Treats Vitamin D deficiency',                   'Do not overdose',            'med-vitd3-60k')
ON CONFLICT (id) DO NOTHING;

-- Diet Plans
INSERT INTO "DietPlan" (
  id, "prescriptionId", "patientId",
  "foodsToEat", "foodsToAvoid",
  "mealTiming", "waterIntake",
  "specialNotes", "generatedAt"
) VALUES
  (
    'diet-001', 'rx-001', 'pat-ramesh-kumar',
    ARRAY['Brown rice', 'Oats', 'Leafy vegetables', 'Dal', 'Fish', 'Egg whites', 'Low-fat dairy'],
    ARRAY['White rice (large qty)', 'Sugary drinks', 'Fried foods', 'Processed foods', 'Excess salt (>5g/day)'],
    '{"breakfast": "7-8 AM - Oats or idli with vegetables", "lunch": "12-1 PM - Brown rice with dal and salad", "dinner": "7-8 PM - Chapati with vegetables", "snacks": "Mid-morning fruit, Evening nuts"}',
    '2.5 litres per day',
    'Walk 30 minutes after dinner. Take medicines with meals. Monitor blood sugar twice daily.',
    NOW()
  ),
  (
    'diet-002', 'rx-002', 'pat-priya-nair',
    ARRAY['Milk', 'Eggs', 'Fish', 'Sunlight 15 mins daily', 'Green leafy vegetables', 'Nuts'],
    ARRAY['Excess caffeine', 'Alcohol', 'High-sodium foods'],
    '{"breakfast": "8 AM - Eggs with toast", "lunch": "1 PM - Balanced meal", "dinner": "8 PM - Light dinner"}',
    '2 litres per day',
    'Take Vitamin D tablet after breakfast. Reduce screen time to prevent headaches.',
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 17. SAMPLE SHIFTS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSERT INTO "Shift" (
  id, "staffId", "doctorId", role,
  "shiftType", "startTime", "endTime",
  "isPresent", "createdAt"
) VALUES
  ('shift-001', 'staff-nrs-001', NULL,            'NURSE',  'morning', NOW()::date + TIME '07:00', NOW()::date + TIME '15:00', true, NOW()),
  ('shift-002', 'staff-nrs-002', NULL,            'NURSE',  'night',   NOW()::date + TIME '23:00', NOW()::date + INTERVAL '1 day' + TIME '07:00', true, NOW()),
  ('shift-003', 'staff-phr-001', NULL,            'PHARMACIST', 'morning', NOW()::date + TIME '08:00', NOW()::date + TIME '16:00', true, NOW()),
  ('shift-004', NULL,            'doc-anil-sharma','doctor','morning', NOW()::date + TIME '09:00', NOW()::date + TIME '17:00', true, NOW()),
  ('shift-005', NULL,            'doc-kavya-nair', 'doctor','night',   NOW()::date + TIME '20:00', NOW()::date + INTERVAL '1 day' + TIME '08:00', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 18. SAMPLE AUDIT LOGS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSERT INTO "AuditLog" (
  id, "userId", "userName", "userRole",
  action, module, "recordId",
  "ipAddress", "riskScore", flagged,
  timestamp
) VALUES
  ('log-001', 'staff-admin-001', 'Admin User',      'admin',       'LOGIN',  'auth',     NULL,                '192.168.1.1',  0,  false, NOW() - INTERVAL '3 hours'),
  ('log-002', 'doc-anil-sharma', 'Dr. Anil Sharma', 'doctor',      'VIEW',   'patient',  'pat-ramesh-kumar',  '192.168.1.10', 0,  false, NOW() - INTERVAL '2 hours'),
  ('log-003', 'doc-anil-sharma', 'Dr. Anil Sharma', 'doctor',      'CREATE', 'prescription','rx-001',         '192.168.1.10', 0,  false, NOW() - INTERVAL '2 hours'),
  ('log-004', 'staff-phr-001',   'Ravi Kumar',      'pharmacist',  'UPDATE', 'pharmacy', 'med-metf-500',      '192.168.1.35', 5,  false, NOW() - INTERVAL '1 hour'),
  ('log-005', 'unknown',         'Unknown',         'unknown',     'LOGIN',  'auth',     NULL,                '45.132.67.89', 95, true,  NOW() - INTERVAL '30 minutes'),
  ('log-006', 'pat-ramesh-kumar','Ramesh Kumar',    'patient',     'VIEW',   'patient',  'pat-ramesh-kumar',  '192.168.1.50', 0,  false, NOW() - INTERVAL '20 minutes')
ON CONFLICT (id) DO NOTHING;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- VERIFY: Check what was inserted
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SELECT 'HospitalSettings' as table_name, COUNT(*) as count FROM "HospitalSettings"
UNION ALL SELECT 'Department',   COUNT(*) FROM "Department"
UNION ALL SELECT 'Room',         COUNT(*) FROM "Room"
UNION ALL SELECT 'Bed',          COUNT(*) FROM "Bed"
UNION ALL SELECT 'Doctor',       COUNT(*) FROM "Doctor"
UNION ALL SELECT 'Staff',        COUNT(*) FROM "Staff"
UNION ALL SELECT 'Patient',      COUNT(*) FROM "Patient"
UNION ALL SELECT 'Medicine',     COUNT(*) FROM "Medicine"
UNION ALL SELECT 'Ambulance',    COUNT(*) FROM "Ambulance"
UNION ALL SELECT 'BloodInventory', COUNT(*) FROM "BloodInventory"
UNION ALL SELECT 'BloodDonor',   COUNT(*) FROM "BloodDonor"
UNION ALL SELECT 'Appointment',  COUNT(*) FROM "Appointment"
UNION ALL SELECT 'Admission',    COUNT(*) FROM "Admission"
UNION ALL SELECT 'Prescription', COUNT(*) FROM "Prescription"
UNION ALL SELECT 'Bill',         COUNT(*) FROM "Bill"
UNION ALL SELECT 'VitalsReading',COUNT(*) FROM "VitalsReading"
UNION ALL SELECT 'AuditLog',     COUNT(*) FROM "AuditLog"
ORDER BY table_name;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- TEST LOGIN CREDENTIALS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Patient:
--   ID: PAT-2024-0001  Password: Patient@123
--   ID: PAT-2024-0002  Password: Patient@123
--
-- Doctor:
--   Code: DOC-2024-CARD-001  Password: Doctor@123
--   Code: DOC-2024-NEUR-001  Password: Doctor@123
--   Code: DOC-2024-PEDS-001  Password: Doctor@123
--
-- Staff/Admin:
--   ID: STF-ADM-001  Password: Staff@123
--   ID: STF-NRS-001  Password: Staff@123
--   ID: STF-PHR-001  Password: Staff@123
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
