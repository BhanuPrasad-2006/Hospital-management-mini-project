-- ============================================================================
-- Hospital Management System — Raw SQL Reference Schema
-- For use with pgAdmin or direct PostgreSQL administration.
-- Note: The AUTHORITATIVE schema is backend/prisma/schema.prisma
--       This file is a SQL reference mirror.
-- ============================================================================

-- Enums
CREATE TYPE "Role" AS ENUM ('ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PHARMACIST', 'PATIENT');
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
CREATE TYPE "PrescriptionStatus" AS ENUM ('ACTIVE', 'DISPENSED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "BillStatus" AS ENUM ('PENDING', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED');
CREATE TYPE "EmergencyPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "BloodGroup" AS ENUM ('A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG');

-- Users & Auth
CREATE TABLE "User" (
    "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "email"         VARCHAR(255) UNIQUE NOT NULL,
    "passwordHash"  TEXT NOT NULL,
    "role"          "Role" DEFAULT 'PATIENT',
    "isActive"      BOOLEAN DEFAULT TRUE,
    "lastLoginAt"   TIMESTAMP,
    "failedLogins"  INT DEFAULT 0,
    "lockedUntil"   TIMESTAMP,
    "createdAt"     TIMESTAMP DEFAULT NOW(),
    "updatedAt"     TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_email ON "User"("email");
CREATE INDEX idx_user_role ON "User"("role");

-- Sessions
CREATE TABLE "Session" (
    "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId"     UUID REFERENCES "User"("id") ON DELETE CASCADE,
    "token"      TEXT UNIQUE NOT NULL,
    "ipAddress"  VARCHAR(45),
    "userAgent"  TEXT,
    "expiresAt"  TIMESTAMP NOT NULL,
    "createdAt"  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_session_user ON "Session"("userId");
CREATE INDEX idx_session_token ON "Session"("token");

-- Patients
CREATE TABLE "Patient" (
    "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId"           UUID UNIQUE REFERENCES "User"("id") ON DELETE CASCADE,
    "firstName"        VARCHAR(100) NOT NULL,
    "lastName"         VARCHAR(100) NOT NULL,
    "dateOfBirth"      DATE NOT NULL,
    "gender"           "Gender" NOT NULL,
    "phone"            VARCHAR(20),
    "address"          TEXT,
    "bloodGroup"       "BloodGroup",
    "emergencyContact" VARCHAR(20),
    "insuranceId"      TEXT,  -- AES-256 encrypted
    "allergies"        TEXT,
    "createdAt"        TIMESTAMP DEFAULT NOW(),
    "updatedAt"        TIMESTAMP DEFAULT NOW()
);

-- Doctors
CREATE TABLE "Doctor" (
    "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId"          UUID UNIQUE REFERENCES "User"("id") ON DELETE CASCADE,
    "firstName"       VARCHAR(100) NOT NULL,
    "lastName"        VARCHAR(100) NOT NULL,
    "specialization"  VARCHAR(100) NOT NULL,
    "licenseNumber"   VARCHAR(50) UNIQUE NOT NULL,
    "phone"           VARCHAR(20),
    "isAvailable"     BOOLEAN DEFAULT TRUE,
    "createdAt"       TIMESTAMP DEFAULT NOW(),
    "updatedAt"       TIMESTAMP DEFAULT NOW()
);

-- Appointments
CREATE TABLE "Appointment" (
    "id"        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "patientId" UUID REFERENCES "Patient"("id"),
    "doctorId"  UUID REFERENCES "Doctor"("id"),
    "dateTime"  TIMESTAMP NOT NULL,
    "duration"  INT DEFAULT 30,
    "reason"    TEXT,
    "notes"     TEXT,
    "status"    "AppointmentStatus" DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Prescriptions
CREATE TABLE "Prescription" (
    "id"        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "patientId" UUID REFERENCES "Patient"("id"),
    "doctorId"  UUID REFERENCES "Doctor"("id"),
    "diagnosis" TEXT NOT NULL,
    "notes"     TEXT,
    "status"    "PrescriptionStatus" DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "PrescriptionItem" (
    "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "prescriptionId"  UUID REFERENCES "Prescription"("id") ON DELETE CASCADE,
    "medicineName"    VARCHAR(200) NOT NULL,
    "dosage"          VARCHAR(100) NOT NULL,
    "frequency"       VARCHAR(100) NOT NULL,
    "duration"        VARCHAR(100) NOT NULL,
    "instructions"    TEXT
);

-- Medicine / Pharmacy
CREATE TABLE "Medicine" (
    "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name"         VARCHAR(200) NOT NULL,
    "genericName"  VARCHAR(200),
    "manufacturer" VARCHAR(200),
    "category"     VARCHAR(100),
    "unitPrice"    NUMERIC(10,2) NOT NULL,
    "stock"        INT DEFAULT 0,
    "reorderLevel" INT DEFAULT 10,
    "expiryDate"   DATE,
    "createdAt"    TIMESTAMP DEFAULT NOW(),
    "updatedAt"    TIMESTAMP DEFAULT NOW()
);

-- Billing
CREATE TABLE "Bill" (
    "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "patientId"   UUID REFERENCES "Patient"("id"),
    "totalAmount" NUMERIC(12,2) NOT NULL,
    "paidAmount"  NUMERIC(12,2) DEFAULT 0,
    "status"      "BillStatus" DEFAULT 'PENDING',
    "dueDate"     DATE,
    "notes"       TEXT,
    "createdAt"   TIMESTAMP DEFAULT NOW(),
    "updatedAt"   TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "BillItem" (
    "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "billId"      UUID REFERENCES "Bill"("id") ON DELETE CASCADE,
    "description" TEXT NOT NULL,
    "quantity"    INT DEFAULT 1,
    "unitPrice"   NUMERIC(10,2) NOT NULL,
    "total"       NUMERIC(10,2) NOT NULL
);

-- Emergency
CREATE TABLE "Emergency" (
    "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "patientId"    UUID REFERENCES "Patient"("id"),
    "callerName"   VARCHAR(100) NOT NULL,
    "callerPhone"  VARCHAR(20) NOT NULL,
    "location"     TEXT NOT NULL,
    "description"  TEXT NOT NULL,
    "priority"     "EmergencyPriority" DEFAULT 'HIGH',
    "isResolved"   BOOLEAN DEFAULT FALSE,
    "resolvedAt"   TIMESTAMP,
    "dispatchedAt" TIMESTAMP,
    "createdAt"    TIMESTAMP DEFAULT NOW(),
    "updatedAt"    TIMESTAMP DEFAULT NOW()
);

-- Blood Bank
CREATE TABLE "BloodDonor" (
    "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "firstName"   VARCHAR(100) NOT NULL,
    "lastName"    VARCHAR(100) NOT NULL,
    "bloodGroup"  "BloodGroup" NOT NULL,
    "phone"       VARCHAR(20) NOT NULL,
    "email"       VARCHAR(255),
    "address"     TEXT,
    "lastDonated" DATE,
    "isEligible"  BOOLEAN DEFAULT TRUE,
    "createdAt"   TIMESTAMP DEFAULT NOW(),
    "updatedAt"   TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "BloodInventory" (
    "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "bloodGroup" "BloodGroup" NOT NULL,
    "units"      INT DEFAULT 0,
    "expiryDate" DATE NOT NULL,
    "createdAt"  TIMESTAMP DEFAULT NOW(),
    "updatedAt"  TIMESTAMP DEFAULT NOW()
);

-- Audit Logs (Blockchain-style)
CREATE TABLE "AuditLog" (
    "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId"     UUID REFERENCES "User"("id"),
    "action"     VARCHAR(50) NOT NULL,
    "resource"   VARCHAR(100) NOT NULL,
    "resourceId" UUID,
    "ipAddress"  VARCHAR(45),
    "userAgent"  TEXT,
    "details"    JSONB,
    "prevHash"   VARCHAR(64),
    "hash"       VARCHAR(64),
    "createdAt"  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON "AuditLog"("userId");
CREATE INDEX idx_audit_action ON "AuditLog"("action");
CREATE INDEX idx_audit_resource ON "AuditLog"("resource");
CREATE INDEX idx_audit_created ON "AuditLog"("createdAt");
