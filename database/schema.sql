-- ============================================
-- AROGYASEVA HMS - Raw SQL Schema
-- database/schema.sql
--
-- This is a REFERENCE file only.
-- The REAL schema is backend/prisma/schema.prisma
-- Prisma auto-generates and runs migrations.
--
-- Use this file ONLY if:
-- 1. You want to run SQL directly in pgAdmin
-- 2. You want to understand the table structure
-- 3. You are not using Prisma
--
-- To create tables properly, use:
--   npx prisma migrate dev
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ENUMS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$ BEGIN
  CREATE TYPE "StaffRole" AS ENUM (
    'ADMIN',
    'RECEPTIONIST',
    'NURSE',
    'PHARMACIST',
    'LAB_TECHNICIAN',
    'ACCOUNTANT',
    'SECURITY_OFFICER',
    'HOUSEKEEPING',
    'AMBULANCE_DRIVER'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- HOSPITAL SETTINGS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS "HospitalSettings" (
  id               TEXT PRIMARY KEY DEFAULT 'default',
  "hospitalName"   TEXT NOT NULL DEFAULT 'ArogyaSeva Medical Centre',
  address          TEXT,
  phone            TEXT,
  email            TEXT,
  "registrationNo" TEXT,
  "emergencyPhone" TEXT,
  "workingHours"   TEXT,
  "logoUrl"        TEXT,
  "updatedAt"      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- DEPARTMENT
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS "Department" (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name           TEXT UNIQUE NOT NULL,
  floor          INT,
  "totalBeds"    INT DEFAULT 0,
  "headDoctorId" TEXT,
  phone          TEXT,
  "isActive"     BOOLEAN DEFAULT TRUE,
  "createdAt"    TIMESTAMP DEFAULT NOW()
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ROOM
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS "Room" (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "roomNumber"   TEXT UNIQUE NOT NULL,
  floor          INT NOT NULL,
  "departmentId" TEXT NOT NULL REFERENCES "Department"(id),
  type           TEXT NOT NULL,  -- general/private/icu/emergency/ot
  "isActive"     BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS "Room_departmentId_idx" ON "Room"("departmentId");
CREATE INDEX IF NOT EXISTS "Room_type_idx"         ON "Room"(type);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BED
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS "Bed" (
  id                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "bedNumber"        TEXT NOT NULL,
  "roomId"           TEXT NOT NULL REFERENCES "Room"(id),
  status             TEXT DEFAULT 'available',
  "currentPatientId" TEXT,
  UNIQUE ("roomId", "bedNumber")
);

CREATE INDEX IF NOT EXISTS "Bed_status_idx" ON "Bed"(status);
CREATE INDEX IF NOT EXISTS "Bed_roomId_idx" ON "Bed"("roomId");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PATIENT
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS "Patient" (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "patientId"         TEXT UNIQUE NOT NULL,   -- PAT-2024-0001
  "abhaId"            TEXT UNIQUE,
  "firstName"         BYTEA NOT NULL,         -- AES-256 encrypted
  "lastName"          BYTEA NOT NULL,         -- AES-256 encrypted
  "dateOfBirth"       TIMESTAMP NOT NULL,
  gender              TEXT NOT NULL,
  "bloodGroup"        TEXT,
  phone               BYTEA NOT NULL,         -- AES-256 encrypted
  email               BYTEA,
  address             BYTEA,
  "emergencyContact"  BYTEA,
  "emergencyPhone"    BYTEA,
  "passwordHash"      TEXT NOT NULL,
  "profilePhoto"      TEXT,
  allergies           TEXT[] DEFAULT '{}',
  "chronicConditions" TEXT[] DEFAULT '{}',
  height              FLOAT,
  weight              FLOAT,
  "isSmoker"          BOOLEAN DEFAULT FALSE,
  "preferredLanguage" TEXT DEFAULT 'en',
  theme               TEXT DEFAULT 'light',
  "isActive"          BOOLEAN DEFAULT TRUE,
  "isDeleted"         BOOLEAN DEFAULT FALSE,
  "deletedAt"         TIMESTAMP,
  "createdAt"         TIMESTAMP DEFAULT NOW(),
  "updatedAt"         TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "Patient_patientId_idx"  ON "Patient"("patientId");
CREATE INDEX IF NOT EXISTS "Patient_bloodGroup_idx" ON "Patient"("bloodGroup");
CREATE INDEX IF NOT EXISTS "Patient_isDeleted_idx"  ON "Patient"("isDeleted");
CREATE INDEX IF NOT EXISTS "Patient_createdAt_idx"  ON "Patient"("createdAt");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PATIENT SETTINGS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS "PatientSettings" (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "patientId"       TEXT UNIQUE NOT NULL REFERENCES "Patient"(id),
  "apptReminders"   BOOLEAN DEFAULT TRUE,
  "medicineReminders" BOOLEAN DEFAULT TRUE,
  "billAlerts"      BOOLEAN DEFAULT TRUE,
  "reportReady"     BOOLEAN DEFAULT TRUE,
  "whatsappNotifs"  BOOLEAN DEFAULT TRUE,
  "emailNotifs"     BOOLEAN DEFAULT FALSE,
  "reminderMinutes" INT DEFAULT 30,
  "updatedAt"       TIMESTAMP DEFAULT NOW()
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PATIENT HISTORY
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS "PatientHistory" (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "patientId"   TEXT NOT NULL REFERENCES "Patient"(id),
  "visitDate"   TIMESTAMP NOT NULL,
  diagnosis     TEXT NOT NULL,
  treatment     TEXT,
  "doctorId"    TEXT,
  "hospitalName" TEXT,
  notes         TEXT,
  "createdAt"   TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "PatientHistory_patientId_idx" ON "PatientHistory"("patientId");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- DOCTOR
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS "Doctor" (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "doctorCode"     TEXT UNIQUE NOT NULL,  -- DOC-2024-CARD-001
  "firstName"      TEXT NOT NULL,
  "lastName"       TEXT NOT NULL,
  "profilePhoto"   TEXT,
  specialization   TEXT NOT NULL,
  qualification    TEXT NOT NULL,
  "licenseNumber"  TEXT UNIQUE NOT NULL,
  "experienceYears" INT DEFAULT 0,
  "departmentId"   TEXT REFERENCES "Department"(id),
  phone            BYTEA,
  email            BYTEA,
  "passwordHash"   TEXT NOT NULL,
  "consultationFee" DECIMAL(10,2) DEFAULT 0,
  "availableDays"  TEXT[] DEFAULT '{}',
  "workStartTime"  TEXT DEFAULT '09:00',
  "workEndTime"    TEXT DEFAULT '17:00',
  "currentStatus"  TEXT DEFAULT 'available',
  "isActive"       BOOLEAN DEFAULT TRUE,
  "isDeleted"      BOOLEAN DEFAULT FALSE,
  "joiningDate"    TIMESTAMP DEFAULT NOW(),
  "deletedAt"      TIMESTAMP,
  "createdAt"      TIMESTAMP DEFAULT NOW(),
  "updatedAt"      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "Doctor_doctorCode_idx"     ON "Doctor"("doctorCode");
CREATE INDEX IF NOT EXISTS "Doctor_specialization_idx" ON "Doctor"(specialization);
CREATE INDEX IF NOT EXISTS "Doctor_isDeleted_idx"      ON "Doctor"("isDeleted");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- DOCTOR SETTINGS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS "DoctorSettings" (
  id                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "doctorId"         TEXT UNIQUE NOT NULL REFERENCES "Doctor"(id),
  "preferredLanguage" TEXT DEFAULT 'en',
  "apptReminders"    BOOLEAN DEFAULT TRUE,
  "patientAlerts"    BOOLEAN DEFAULT TRUE,
  "labResultAlerts"  BOOLEAN DEFAULT TRUE,
  "updatedAt"        TIMESTAMP DEFAULT NOW()
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- DOCTOR LEAVE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS "DoctorLeave" (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "doctorId"  TEXT NOT NULL REFERENCES "Doctor"(id),
  "startDate" TIMESTAMP NOT NULL,
  "endDate"   TIMESTAMP NOT NULL,
  reason      TEXT NOT NULL,
  approved    BOOLEAN DEFAULT FALSE,
  "approvedBy" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "DoctorLeave_doctorId_idx" ON "DoctorLeave"("doctorId");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STAFF
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS "Staff" (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "staffId"       TEXT UNIQUE NOT NULL,   -- STF-NRS-001
  "firstName"     TEXT NOT NULL,
  "lastName"      TEXT NOT NULL,
  "profilePhoto"  TEXT,
  role            "StaffRole" NOT NULL,
  "departmentId"  TEXT REFERENCES "Department"(id),
  phone           BYTEA,
  email           BYTEA,
  "passwordHash"  TEXT NOT NULL,
  qualification   TEXT,
  "experienceYears" INT DEFAULT 0,
  "joiningDate"   TIMESTAMP DEFAULT NOW(),
  salary          DECIMAL(10,2),
  "isActive"      BOOLEAN DEFAULT TRUE,
  "isDeleted"     BOOLEAN DEFAULT FALSE,
  "deletedAt"     TIMESTAMP,
  "createdAt"     TIMESTAMP DEFAULT NOW(),
  "updatedAt"     TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "Staff_staffId_idx"  ON "Staff"("staffId");
CREATE INDEX IF NOT EXISTS "Staff_role_idx"     ON "Staff"(role);
CREATE INDEX IF NOT EXISTS "Staff_isDeleted_idx" ON "Staff"("isDeleted");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STAFF SETTINGS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS "StaffSettings" (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "staffId"           TEXT UNIQUE NOT NULL REFERENCES "Staff"(id),
  "preferredLanguage" TEXT DEFAULT 'en',
  notifications       BOOLEAN DEFAULT TRUE,
  theme               TEXT DEFAULT 'light',
  "updatedAt"         TIMESTAMP DEFAULT NOW()
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- APPOINTMENTS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS "Appointment" (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "patientId"   TEXT NOT NULL REFERENCES "Patient"(id),
  "doctorId"    TEXT NOT NULL REFERENCES "Doctor"(id),
  "scheduledAt" TIMESTAMP NOT NULL,
  type          TEXT NOT NULL,
  status        TEXT DEFAULT 'confirmed',
  reason        TEXT,
  notes         TEXT,
  "tokenNumber" INT,
  "isDeleted"   BOOLEAN DEFAULT FALSE,
  "createdAt"   TIMESTAMP DEFAULT NOW(),
  "updatedAt"   TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "Appointment_patientId_idx"   ON "Appointment"("patientId");
CREATE INDEX IF NOT EXISTS "Appointment_doctorId_idx"    ON "Appointment"("doctorId");
CREATE INDEX IF NOT EXISTS "Appointment_scheduledAt_idx" ON "Appointment"("scheduledAt");
CREATE INDEX IF NOT EXISTS "Appointment_status_idx"      ON "Appointment"(status);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ADMISSION
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS "Admission" (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "patientId"      TEXT NOT NULL REFERENCES "Patient"(id),
  "doctorId"       TEXT NOT NULL REFERENCES "Doctor"(id),
  "bedId"          TEXT NOT NULL REFERENCES "Bed"(id),
  "admissionType"  TEXT NOT NULL,
  "admissionReason" TEXT NOT NULL,
  diagnosis        TEXT,
  "admittedAt"     TIMESTAMP DEFAULT NOW(),
  "dischargedAt"   TIMESTAMP,
  "dischargeSummary" TEXT,
  "followUpDate"   TIMESTAMP,
  "isDeleted"      BOOLEAN DEFAULT FALSE,
  "createdAt"      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "Admission_patientId_idx"  ON "Admission"("patientId");
CREATE INDEX IF NOT EXISTS "Admission_admittedAt_idx" ON "Admission"("admittedAt");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PRESCRIPTION
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS "Prescription" (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "patientId"   TEXT NOT NULL REFERENCES "Patient"(id),
  "doctorId"    TEXT NOT NULL REFERENCES "Doctor"(id),
  "imageUrl"    TEXT,
  "rawOcrText"  TEXT,
  diagnosis     TEXT,
  "isAiScanned" BOOLEAN DEFAULT FALSE,
  language      TEXT DEFAULT 'en',
  "expiresAt"   TIMESTAMP NOT NULL,
  "isDeleted"   BOOLEAN DEFAULT FALSE,
  "createdAt"   TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "Prescription_patientId_idx" ON "Prescription"("patientId");
CREATE INDEX IF NOT EXISTS "Prescription_doctorId_idx"  ON "Prescription"("doctorId");
CREATE INDEX IF NOT EXISTS "Prescription_createdAt_idx" ON "Prescription"("createdAt");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PRESCRIPTION MEDICINES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS "PrescriptionMedicine" (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "prescriptionId" TEXT NOT NULL REFERENCES "Prescription"(id),
  "medicineName"   TEXT NOT NULL,
  "genericName"    TEXT,
  dosage           TEXT NOT NULL,
  frequency        TEXT NOT NULL,
  timing           TEXT NOT NULL,
  "durationDays"   INT NOT NULL,
  purpose          TEXT,
  "sideEffects"    TEXT,
  "medicineId"     TEXT REFERENCES "Medicine"(id)
);

CREATE INDEX IF NOT EXISTS "PrescriptionMedicine_prescriptionId_idx" ON "PrescriptionMedicine"("prescriptionId");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- DIET PLAN
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS "DietPlan" (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "prescriptionId" TEXT UNIQUE NOT NULL REFERENCES "Prescription"(id),
  "patientId"      TEXT NOT NULL,
  "foodsToEat"     TEXT[] DEFAULT '{}',
  "foodsToAvoid"   TEXT[] DEFAULT '{}',
  "mealTiming"     JSONB,
  "waterIntake"    TEXT,
  "specialNotes"   TEXT,
  "generatedAt"    TIMESTAMP DEFAULT NOW()
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- MEDICINE (Pharmacy)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS "Medicine" (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name           TEXT NOT NULL,
  "genericName"  TEXT,
  category       TEXT NOT NULL,
  unit           TEXT NOT NULL,
  "stockUnits"   INT DEFAULT 0,
  "reorderLevel" INT DEFAULT 100,
  "unitPrice"    DECIMAL(10,2) NOT NULL,
  "expiryDate"   TIMESTAMP,
  manufacturer   TEXT,
  "supplierId"   TEXT,
  "isActive"     BOOLEAN DEFAULT TRUE,
  "createdAt"    TIMESTAMP DEFAULT NOW(),
  "updatedAt"    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "Medicine_name_idx"       ON "Medicine"(name);
CREATE INDEX IF NOT EXISTS "Medicine_category_idx"   ON "Medicine"(category);
CREATE INDEX IF NOT EXISTS "Medicine_stockUnits_idx" ON "Medicine"("stockUnits");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- DISPENSE LOG
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS "DispenseLog" (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "medicineId"     TEXT NOT NULL REFERENCES "Medicine"(id),
  "patientId"      TEXT NOT NULL,
  "prescriptionId" TEXT,
  quantity         INT NOT NULL,
  "dispensedById"  TEXT NOT NULL REFERENCES "Staff"(id),
  "dispensedAt"    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "DispenseLog_medicineId_idx"   ON "DispenseLog"("medicineId");
CREATE INDEX IF NOT EXISTS "DispenseLog_patientId_idx"    ON "DispenseLog"("patientId");
CREATE INDEX IF NOT EXISTS "DispenseLog_dispensedAt_idx"  ON "DispenseLog"("dispensedAt");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- MEDICINE ORDERS (Patient online orders)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS "MedicineOrder" (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "patientId"      TEXT NOT NULL REFERENCES "Patient"(id),
  status           TEXT DEFAULT 'placed',
  "deliveryAddress" TEXT NOT NULL,
  "totalAmount"    DECIMAL(10,2) NOT NULL,
  "paymentMethod"  TEXT NOT NULL,
  "paymentStatus"  TEXT DEFAULT 'pending',
  "estimatedMins"  INT DEFAULT 20,
  "orderedAt"      TIMESTAMP DEFAULT NOW(),
  "deliveredAt"    TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "MedicineOrderItem" (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "orderId"   TEXT NOT NULL REFERENCES "MedicineOrder"(id),
  "medicineId" TEXT NOT NULL REFERENCES "Medicine"(id),
  quantity    INT NOT NULL,
  "unitPrice" DECIMAL(10,2) NOT NULL,
  "totalPrice" DECIMAL(10,2) NOT NULL
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BILL
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS "Bill" (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "patientId"      TEXT NOT NULL REFERENCES "Patient"(id),
  "admissionId"    TEXT UNIQUE REFERENCES "Admission"(id),
  "generatedById"  TEXT REFERENCES "Staff"(id),
  "totalAmount"    DECIMAL(10,2) NOT NULL,
  "paidAmount"     DECIMAL(10,2) DEFAULT 0,
  "discountAmount" DECIMAL(10,2) DEFAULT 0,
  "taxAmount"      DECIMAL(10,2) DEFAULT 0,
  status           TEXT DEFAULT 'pending',
  "paymentMethod"  TEXT,
  "insuranceRef"   TEXT,
  "isDeleted"      BOOLEAN DEFAULT FALSE,
  "generatedAt"    TIMESTAMP DEFAULT NOW(),
  "paidAt"         TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Bill_patientId_idx"   ON "Bill"("patientId");
CREATE INDEX IF NOT EXISTS "Bill_status_idx"      ON "Bill"(status);
CREATE INDEX IF NOT EXISTS "Bill_generatedAt_idx" ON "Bill"("generatedAt");

CREATE TABLE IF NOT EXISTS "BillItem" (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "billId"     TEXT NOT NULL REFERENCES "Bill"(id),
  description  TEXT NOT NULL,
  category     TEXT NOT NULL,
  quantity     INT DEFAULT 1,
  "unitPrice"  DECIMAL(10,2) NOT NULL,
  "totalPrice" DECIMAL(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS "Payment" (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "billId"        TEXT NOT NULL REFERENCES "Bill"(id),
  amount          DECIMAL(10,2) NOT NULL,
  method          TEXT NOT NULL,
  "transactionId" TEXT,
  "paidAt"        TIMESTAMP DEFAULT NOW()
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- VITALS READINGS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS "VitalsReading" (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "patientId"      TEXT NOT NULL REFERENCES "Patient"(id),
  "bedId"          TEXT REFERENCES "Bed"(id),
  "admissionId"    TEXT REFERENCES "Admission"(id),
  "heartRate"      INT,
  "bloodPressure"  TEXT,
  "spO2"           INT,
  temperature      FLOAT,
  "respiratoryRate" INT,
  "bloodSugar"     FLOAT,
  source           TEXT DEFAULT 'manual',
  "recordedBy"     TEXT,
  "recordedAt"     TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "VitalsReading_patientId_idx"  ON "VitalsReading"("patientId");
CREATE INDEX IF NOT EXISTS "VitalsReading_recordedAt_idx" ON "VitalsReading"("recordedAt");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- LAB REPORTS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS "LabReport" (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "patientId"    TEXT NOT NULL REFERENCES "Patient"(id),
  "doctorId"     TEXT REFERENCES "Doctor"(id),
  "testName"     TEXT NOT NULL,
  "testDate"     TIMESTAMP NOT NULL,
  "reportUrl"    TEXT,
  results        JSONB,
  "referenceRange" JSONB,
  status         TEXT DEFAULT 'pending',
  "technicianId" TEXT,
  "aiSummary"    TEXT,
  "isDeleted"    BOOLEAN DEFAULT FALSE,
  "createdAt"    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "LabReport_patientId_idx" ON "LabReport"("patientId");
CREATE INDEX IF NOT EXISTS "LabReport_status_idx"    ON "LabReport"(status);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- EMERGENCY & AMBULANCE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS "Ambulance" (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "vehicleNumber" TEXT UNIQUE NOT NULL,
  "driverName"    TEXT NOT NULL,
  "driverPhone"   TEXT NOT NULL,
  "currentLat"    FLOAT NOT NULL,
  "currentLng"    FLOAT NOT NULL,
  status          TEXT DEFAULT 'available',
  "equipmentType" TEXT DEFAULT 'basic',
  "hospitalId"    TEXT,
  "isActive"      BOOLEAN DEFAULT TRUE,
  "createdAt"     TIMESTAMP DEFAULT NOW(),
  "updatedAt"     TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Emergency" (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "patientId"      TEXT REFERENCES "Patient"(id),
  latitude         FLOAT NOT NULL,
  longitude        FLOAT NOT NULL,
  address          TEXT,
  symptoms         TEXT[] DEFAULT '{}',
  status           TEXT DEFAULT 'requested',
  "ambulanceId"    TEXT REFERENCES "Ambulance"(id),
  "etaMinutes"     INT,
  "medicalHistory" JSONB,
  "createdAt"      TIMESTAMP DEFAULT NOW(),
  "arrivedAt"      TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Emergency_status_idx"    ON "Emergency"(status);
CREATE INDEX IF NOT EXISTS "Emergency_createdAt_idx" ON "Emergency"("createdAt");

CREATE TABLE IF NOT EXISTS "AmbulanceTracking" (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "ambulanceId" TEXT NOT NULL REFERENCES "Ambulance"(id),
  "requestId"   TEXT,
  lat           FLOAT NOT NULL,
  lng           FLOAT NOT NULL,
  speed         FLOAT,
  "recordedAt"  TIMESTAMP DEFAULT NOW()
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOOD BANK
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS "BloodDonor" (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name              TEXT NOT NULL,
  "bloodGroup"      TEXT NOT NULL,
  phone             TEXT NOT NULL,
  email             TEXT,
  latitude          FLOAT,
  longitude         FLOAT,
  city              TEXT,
  "isAvailable"     BOOLEAN DEFAULT TRUE,
  "lastDonationDate" TIMESTAMP,
  "totalDonations"  INT DEFAULT 0,
  "healthConditions" TEXT,
  "isActive"        BOOLEAN DEFAULT TRUE,
  "createdAt"       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "BloodDonor_bloodGroup_idx"   ON "BloodDonor"("bloodGroup");
CREATE INDEX IF NOT EXISTS "BloodDonor_isAvailable_idx"  ON "BloodDonor"("isAvailable");

CREATE TABLE IF NOT EXISTS "BloodInventory" (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "bloodGroup"     TEXT UNIQUE NOT NULL,
  "unitsAvailable" INT DEFAULT 0,
  "expiryDate"     TIMESTAMP,
  "lastUpdated"    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "BloodRequest" (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "patientId"   TEXT,
  "bloodGroup"  TEXT NOT NULL,
  "unitsNeeded" INT NOT NULL,
  urgency       TEXT NOT NULL,
  status        TEXT DEFAULT 'pending',
  "requestedBy" TEXT,
  "fulfilledAt" TIMESTAMP,
  "createdAt"   TIMESTAMP DEFAULT NOW()
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SHIFTS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS "Shift" (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "doctorId"     TEXT REFERENCES "Doctor"(id),
  "staffId"      TEXT REFERENCES "Staff"(id),
  "departmentId" TEXT,
  role           TEXT NOT NULL,
  "shiftType"    TEXT NOT NULL,
  "startTime"    TIMESTAMP NOT NULL,
  "endTime"      TIMESTAMP NOT NULL,
  "actualLogin"  TIMESTAMP,
  "actualLogout" TIMESTAMP,
  "isPresent"    BOOLEAN DEFAULT FALSE,
  "createdAt"    TIMESTAMP DEFAULT NOW()
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- NOTIFICATIONS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS "Notification" (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "patientId" TEXT REFERENCES "Patient"(id),
  "staffId"   TEXT,
  "doctorId"  TEXT,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  type        TEXT NOT NULL,
  "isRead"    BOOLEAN DEFAULT FALSE,
  "sentVia"   TEXT[] DEFAULT '{}',
  "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "Notification_patientId_idx" ON "Notification"("patientId");
CREATE INDEX IF NOT EXISTS "Notification_isRead_idx"    ON "Notification"("isRead");

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SECURITY TABLES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS "AuditLog" (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "userId"       TEXT NOT NULL,
  "userName"     TEXT NOT NULL,
  "userRole"     TEXT NOT NULL,
  "patientId"    TEXT REFERENCES "Patient"(id),
  action         TEXT NOT NULL,
  module         TEXT NOT NULL,
  "recordId"     TEXT,
  "oldValue"     JSONB,
  "newValue"     JSONB,
  "ipAddress"    TEXT NOT NULL,
  "deviceType"   TEXT,
  "deviceId"     TEXT,
  "userAgent"    TEXT,
  timestamp      TIMESTAMP DEFAULT NOW(),
  "riskScore"    INT DEFAULT 0,
  flagged        BOOLEAN DEFAULT FALSE,
  "flagReason"   TEXT,
  "logHash"      TEXT,
  "previousHash" TEXT
);

CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx"    ON "AuditLog"("userId");
CREATE INDEX IF NOT EXISTS "AuditLog_timestamp_idx" ON "AuditLog"(timestamp);
CREATE INDEX IF NOT EXISTS "AuditLog_riskScore_idx" ON "AuditLog"("riskScore");
CREATE INDEX IF NOT EXISTS "AuditLog_flagged_idx"   ON "AuditLog"(flagged);
CREATE INDEX IF NOT EXISTS "AuditLog_module_idx"    ON "AuditLog"(module);

CREATE TABLE IF NOT EXISTS "UserSession" (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "userId"       TEXT NOT NULL,
  "userRole"     TEXT NOT NULL,
  "deviceInfo"   TEXT,
  "ipAddress"    TEXT NOT NULL,
  location       TEXT,
  "loginAt"      TIMESTAMP DEFAULT NOW(),
  "lastActive"   TIMESTAMP DEFAULT NOW(),
  "isActive"     BOOLEAN DEFAULT TRUE,
  "refreshToken" TEXT
);

CREATE INDEX IF NOT EXISTS "UserSession_userId_idx"   ON "UserSession"("userId");
CREATE INDEX IF NOT EXISTS "UserSession_isActive_idx" ON "UserSession"("isActive");

CREATE TABLE IF NOT EXISTS "BehaviorProfile" (
  id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "userId"             TEXT UNIQUE NOT NULL,
  "userRole"           TEXT NOT NULL,
  "avgKeystrokeSpeed"  FLOAT,
  "avgTouchPressure"   FLOAT,
  "avgSwipeSpeed"      FLOAT,
  "loginTimingPattern" JSONB,
  "updatedAt"          TIMESTAMP DEFAULT NOW()
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Done!
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SELECT 'Schema created successfully!' as result;
