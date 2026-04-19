-- ============================================================================
-- Hospital Management System — Sample Seed Data
-- Run AFTER Prisma migration: npx prisma migrate dev
-- Usage: psql -U postgres -d hospital_db -f seed.sql
-- ============================================================================

-- Admin user (password: Admin@123)
INSERT INTO "User" ("id", "email", "passwordHash", "role", "isActive") VALUES
  ('a0000000-0000-0000-0000-000000000001', 'admin@hospital.com', '$2a$12$LJ3fVKrHxBfMFQrGKdVg0eiwXZ8Q5.M3F6y7WYcVH0VbEMSXV0fKe', 'ADMIN', TRUE);

-- Sample doctor user (password: Doctor@123)
INSERT INTO "User" ("id", "email", "passwordHash", "role", "isActive") VALUES
  ('d0000000-0000-0000-0000-000000000001', 'dr.sharma@hospital.com', '$2a$12$LJ3fVKrHxBfMFQrGKdVg0eiwXZ8Q5.M3F6y7WYcVH0VbEMSXV0fKe', 'DOCTOR', TRUE);

INSERT INTO "Doctor" ("id", "userId", "firstName", "lastName", "specialization", "licenseNumber", "phone") VALUES
  ('dc000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Priya', 'Sharma', 'General Medicine', 'MCI-2020-001', '9876543210');

-- Sample patient user (password: Patient@123)
INSERT INTO "User" ("id", "email", "passwordHash", "role", "isActive") VALUES
  ('p0000000-0000-0000-0000-000000000001', 'rajesh.kumar@email.com', '$2a$12$LJ3fVKrHxBfMFQrGKdVg0eiwXZ8Q5.M3F6y7WYcVH0VbEMSXV0fKe', 'PATIENT', TRUE);

INSERT INTO "Patient" ("id", "userId", "firstName", "lastName", "dateOfBirth", "gender", "phone", "bloodGroup") VALUES
  ('pa000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000001', 'Rajesh', 'Kumar', '1985-06-15', 'MALE', '9123456789', 'B_POS');

-- Sample medicines
INSERT INTO "Medicine" ("name", "genericName", "manufacturer", "category", "unitPrice", "stock", "reorderLevel") VALUES
  ('Paracetamol 500mg', 'Acetaminophen', 'Cipla', 'Analgesic', 5.00, 500, 50),
  ('Amoxicillin 250mg', 'Amoxicillin', 'Sun Pharma', 'Antibiotic', 12.00, 200, 30),
  ('Metformin 500mg', 'Metformin HCl', 'Dr. Reddy''s', 'Antidiabetic', 8.50, 300, 40),
  ('Omeprazole 20mg', 'Omeprazole', 'Lupin', 'Antacid', 15.00, 150, 20),
  ('Amlodipine 5mg', 'Amlodipine', 'Torrent', 'Antihypertensive', 10.00, 250, 30);

-- Sample blood inventory
INSERT INTO "BloodInventory" ("bloodGroup", "units", "expiryDate") VALUES
  ('A_POS', 25, '2026-07-01'),
  ('B_POS', 30, '2026-07-01'),
  ('O_POS', 40, '2026-07-01'),
  ('AB_POS', 10, '2026-07-01'),
  ('A_NEG', 8, '2026-07-01'),
  ('B_NEG', 5, '2026-07-01'),
  ('O_NEG', 15, '2026-07-01'),
  ('AB_NEG', 3, '2026-07-01');

-- Sample blood donors
INSERT INTO "BloodDonor" ("firstName", "lastName", "bloodGroup", "phone", "email", "isEligible") VALUES
  ('Anita', 'Verma', 'O_POS', '9988776655', 'anita@email.com', TRUE),
  ('Suresh', 'Patel', 'B_POS', '9876543210', 'suresh@email.com', TRUE),
  ('Meena', 'Reddy', 'A_NEG', '9765432109', 'meena@email.com', TRUE);
