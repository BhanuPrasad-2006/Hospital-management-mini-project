-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('ADMIN', 'RECEPTIONIST', 'NURSE', 'PHARMACIST', 'LAB_TECHNICIAN', 'ACCOUNTANT', 'SECURITY_OFFICER', 'HOUSEKEEPING', 'AMBULANCE_DRIVER');

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "abhaId" TEXT,
    "firstName" BYTEA NOT NULL,
    "lastName" BYTEA NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" TEXT NOT NULL,
    "bloodGroup" TEXT,
    "phone" BYTEA NOT NULL,
    "email" BYTEA,
    "address" BYTEA,
    "emergencyContact" BYTEA,
    "emergencyPhone" BYTEA,
    "passwordHash" TEXT NOT NULL,
    "profilePhoto" TEXT,
    "allergies" TEXT[],
    "chronicConditions" TEXT[],
    "height" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "isSmoker" BOOLEAN NOT NULL DEFAULT false,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "theme" TEXT NOT NULL DEFAULT 'light',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientSettings" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "apptReminders" BOOLEAN NOT NULL DEFAULT true,
    "medicineReminders" BOOLEAN NOT NULL DEFAULT true,
    "billAlerts" BOOLEAN NOT NULL DEFAULT true,
    "reportReady" BOOLEAN NOT NULL DEFAULT true,
    "whatsappNotifs" BOOLEAN NOT NULL DEFAULT true,
    "emailNotifs" BOOLEAN NOT NULL DEFAULT false,
    "reminderMinutes" INTEGER NOT NULL DEFAULT 30,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientHistory" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "visitDate" TIMESTAMP(3) NOT NULL,
    "diagnosis" TEXT NOT NULL,
    "treatment" TEXT,
    "doctorId" TEXT,
    "hospitalName" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Doctor" (
    "id" TEXT NOT NULL,
    "doctorCode" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "profilePhoto" TEXT,
    "specialization" TEXT NOT NULL,
    "qualification" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "experienceYears" INTEGER NOT NULL DEFAULT 0,
    "departmentId" TEXT,
    "phone" BYTEA NOT NULL,
    "email" BYTEA NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "consultationFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "availableDays" TEXT[],
    "workStartTime" TEXT NOT NULL DEFAULT '09:00',
    "workEndTime" TEXT NOT NULL DEFAULT '17:00',
    "currentStatus" TEXT NOT NULL DEFAULT 'available',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "joiningDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Doctor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorSettings" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "apptReminders" BOOLEAN NOT NULL DEFAULT true,
    "patientAlerts" BOOLEAN NOT NULL DEFAULT true,
    "labResultAlerts" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorLeave" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DoctorLeave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "profilePhoto" TEXT,
    "role" "StaffRole" NOT NULL,
    "departmentId" TEXT,
    "phone" BYTEA NOT NULL,
    "email" BYTEA NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "qualification" TEXT,
    "experienceYears" INTEGER NOT NULL DEFAULT 0,
    "joiningDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "salary" DECIMAL(10,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffSettings" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "notifications" BOOLEAN NOT NULL DEFAULT true,
    "theme" TEXT NOT NULL DEFAULT 'light',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "floor" INTEGER,
    "totalBeds" INTEGER NOT NULL DEFAULT 0,
    "headDoctorId" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "floor" INTEGER NOT NULL,
    "departmentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bed" (
    "id" TEXT NOT NULL,
    "bedNumber" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'available',
    "currentPatientId" TEXT,

    CONSTRAINT "Bed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "reason" TEXT,
    "notes" TEXT,
    "tokenNumber" INTEGER,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admission" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "bedId" TEXT NOT NULL,
    "admissionType" TEXT NOT NULL,
    "admissionReason" TEXT NOT NULL,
    "diagnosis" TEXT,
    "admittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dischargedAt" TIMESTAMP(3),
    "dischargeSummary" TEXT,
    "followUpDate" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Admission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prescription" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "imageUrl" TEXT,
    "rawOcrText" TEXT,
    "diagnosis" TEXT,
    "isAiScanned" BOOLEAN NOT NULL DEFAULT false,
    "language" TEXT NOT NULL DEFAULT 'en',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrescriptionMedicine" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "medicineName" TEXT NOT NULL,
    "genericName" TEXT,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "timing" TEXT NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "purpose" TEXT,
    "sideEffects" TEXT,
    "medicineId" TEXT,

    CONSTRAINT "PrescriptionMedicine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DietPlan" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "foodsToEat" TEXT[],
    "foodsToAvoid" TEXT[],
    "mealTiming" JSONB NOT NULL,
    "waterIntake" TEXT,
    "specialNotes" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DietPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabReport" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT,
    "testName" TEXT NOT NULL,
    "testDate" TIMESTAMP(3) NOT NULL,
    "reportUrl" TEXT,
    "results" JSONB,
    "referenceRange" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "technicianId" TEXT,
    "aiSummary" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VitalsReading" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "bedId" TEXT,
    "admissionId" TEXT,
    "heartRate" INTEGER,
    "bloodPressure" TEXT,
    "spO2" INTEGER,
    "temperature" DOUBLE PRECISION,
    "respiratoryRate" INTEGER,
    "bloodSugar" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "recordedBy" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VitalsReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medicine" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "genericName" TEXT,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "stockUnits" INTEGER NOT NULL DEFAULT 0,
    "reorderLevel" INTEGER NOT NULL DEFAULT 100,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "manufacturer" TEXT,
    "supplierId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medicine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispenseLog" (
    "id" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "prescriptionId" TEXT,
    "quantity" INTEGER NOT NULL,
    "dispensedById" TEXT NOT NULL,
    "dispensedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DispenseLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicineOrder" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'placed',
    "deliveryAddress" TEXT NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "estimatedMins" INTEGER NOT NULL DEFAULT 20,
    "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "MedicineOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicineOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "MedicineOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bill" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "admissionId" TEXT,
    "generatedById" TEXT,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paymentMethod" TEXT,
    "insuranceRef" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "Bill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillItem" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "BillItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" TEXT NOT NULL,
    "transactionId" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Emergency" (
    "id" TEXT NOT NULL,
    "patientId" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "symptoms" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'requested',
    "ambulanceId" TEXT,
    "etaMinutes" INTEGER,
    "medicalHistory" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "arrivedAt" TIMESTAMP(3),

    CONSTRAINT "Emergency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ambulance" (
    "id" TEXT NOT NULL,
    "vehicleNumber" TEXT NOT NULL,
    "driverName" TEXT NOT NULL,
    "driverPhone" TEXT NOT NULL,
    "currentLat" DOUBLE PRECISION NOT NULL,
    "currentLng" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'available',
    "equipmentType" TEXT NOT NULL DEFAULT 'basic',
    "hospitalId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ambulance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmbulanceTracking" (
    "id" TEXT NOT NULL,
    "ambulanceId" TEXT NOT NULL,
    "requestId" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "speed" DOUBLE PRECISION,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AmbulanceTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BloodDonor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bloodGroup" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "city" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "lastDonationDate" TIMESTAMP(3),
    "totalDonations" INTEGER NOT NULL DEFAULT 0,
    "healthConditions" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BloodDonor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BloodInventory" (
    "id" TEXT NOT NULL,
    "bloodGroup" TEXT NOT NULL,
    "unitsAvailable" INTEGER NOT NULL DEFAULT 0,
    "expiryDate" TIMESTAMP(3),
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BloodInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BloodRequest" (
    "id" TEXT NOT NULL,
    "patientId" TEXT,
    "bloodGroup" TEXT NOT NULL,
    "unitsNeeded" INTEGER NOT NULL,
    "urgency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedBy" TEXT,
    "fulfilledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BloodRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT,
    "staffId" TEXT,
    "departmentId" TEXT,
    "role" TEXT NOT NULL,
    "shiftType" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "actualLogin" TIMESTAMP(3),
    "actualLogout" TIMESTAMP(3),
    "isPresent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "patientId" TEXT,
    "staffId" TEXT,
    "doctorId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "sentVia" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userRole" TEXT NOT NULL,
    "patientId" TEXT,
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "recordId" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT NOT NULL,
    "deviceType" TEXT,
    "deviceId" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "flagReason" TEXT,
    "logHash" TEXT,
    "previousHash" TEXT,
    "staffId" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userRole" TEXT NOT NULL,
    "deviceInfo" TEXT,
    "ipAddress" TEXT NOT NULL,
    "location" TEXT,
    "loginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActive" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "refreshToken" TEXT,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BehaviorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userRole" TEXT NOT NULL,
    "avgKeystrokeSpeed" DOUBLE PRECISION,
    "avgTouchPressure" DOUBLE PRECISION,
    "avgSwipeSpeed" DOUBLE PRECISION,
    "loginTimingPattern" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BehaviorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HospitalSettings" (
    "id" TEXT NOT NULL,
    "hospitalName" TEXT NOT NULL DEFAULT 'ArogyaSeva Medical Centre',
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "registrationNo" TEXT,
    "emergencyPhone" TEXT,
    "workingHours" TEXT,
    "logoUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HospitalSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Patient_patientId_key" ON "Patient"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_abhaId_key" ON "Patient"("abhaId");

-- CreateIndex
CREATE INDEX "Patient_patientId_idx" ON "Patient"("patientId");

-- CreateIndex
CREATE INDEX "Patient_phone_idx" ON "Patient"("phone");

-- CreateIndex
CREATE INDEX "Patient_bloodGroup_idx" ON "Patient"("bloodGroup");

-- CreateIndex
CREATE INDEX "Patient_isDeleted_idx" ON "Patient"("isDeleted");

-- CreateIndex
CREATE INDEX "Patient_createdAt_idx" ON "Patient"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PatientSettings_patientId_key" ON "PatientSettings"("patientId");

-- CreateIndex
CREATE INDEX "PatientHistory_patientId_idx" ON "PatientHistory"("patientId");

-- CreateIndex
CREATE INDEX "PatientHistory_visitDate_idx" ON "PatientHistory"("visitDate");

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_doctorCode_key" ON "Doctor"("doctorCode");

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_licenseNumber_key" ON "Doctor"("licenseNumber");

-- CreateIndex
CREATE INDEX "Doctor_doctorCode_idx" ON "Doctor"("doctorCode");

-- CreateIndex
CREATE INDEX "Doctor_specialization_idx" ON "Doctor"("specialization");

-- CreateIndex
CREATE INDEX "Doctor_licenseNumber_idx" ON "Doctor"("licenseNumber");

-- CreateIndex
CREATE INDEX "Doctor_isDeleted_idx" ON "Doctor"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorSettings_doctorId_key" ON "DoctorSettings"("doctorId");

-- CreateIndex
CREATE INDEX "DoctorLeave_doctorId_idx" ON "DoctorLeave"("doctorId");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_staffId_key" ON "Staff"("staffId");

-- CreateIndex
CREATE INDEX "Staff_staffId_idx" ON "Staff"("staffId");

-- CreateIndex
CREATE INDEX "Staff_role_idx" ON "Staff"("role");

-- CreateIndex
CREATE INDEX "Staff_isDeleted_idx" ON "Staff"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "StaffSettings_staffId_key" ON "StaffSettings"("staffId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE INDEX "Department_name_idx" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Room_roomNumber_key" ON "Room"("roomNumber");

-- CreateIndex
CREATE INDEX "Room_departmentId_idx" ON "Room"("departmentId");

-- CreateIndex
CREATE INDEX "Room_type_idx" ON "Room"("type");

-- CreateIndex
CREATE INDEX "Bed_status_idx" ON "Bed"("status");

-- CreateIndex
CREATE INDEX "Bed_roomId_idx" ON "Bed"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "Bed_roomId_bedNumber_key" ON "Bed"("roomId", "bedNumber");

-- CreateIndex
CREATE INDEX "Appointment_patientId_idx" ON "Appointment"("patientId");

-- CreateIndex
CREATE INDEX "Appointment_doctorId_idx" ON "Appointment"("doctorId");

-- CreateIndex
CREATE INDEX "Appointment_scheduledAt_idx" ON "Appointment"("scheduledAt");

-- CreateIndex
CREATE INDEX "Appointment_status_idx" ON "Appointment"("status");

-- CreateIndex
CREATE INDEX "Admission_patientId_idx" ON "Admission"("patientId");

-- CreateIndex
CREATE INDEX "Admission_doctorId_idx" ON "Admission"("doctorId");

-- CreateIndex
CREATE INDEX "Admission_admittedAt_idx" ON "Admission"("admittedAt");

-- CreateIndex
CREATE INDEX "Prescription_patientId_idx" ON "Prescription"("patientId");

-- CreateIndex
CREATE INDEX "Prescription_doctorId_idx" ON "Prescription"("doctorId");

-- CreateIndex
CREATE INDEX "Prescription_createdAt_idx" ON "Prescription"("createdAt");

-- CreateIndex
CREATE INDEX "PrescriptionMedicine_prescriptionId_idx" ON "PrescriptionMedicine"("prescriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "DietPlan_prescriptionId_key" ON "DietPlan"("prescriptionId");

-- CreateIndex
CREATE INDEX "DietPlan_patientId_idx" ON "DietPlan"("patientId");

-- CreateIndex
CREATE INDEX "LabReport_patientId_idx" ON "LabReport"("patientId");

-- CreateIndex
CREATE INDEX "LabReport_status_idx" ON "LabReport"("status");

-- CreateIndex
CREATE INDEX "VitalsReading_patientId_idx" ON "VitalsReading"("patientId");

-- CreateIndex
CREATE INDEX "VitalsReading_recordedAt_idx" ON "VitalsReading"("recordedAt");

-- CreateIndex
CREATE INDEX "Medicine_name_idx" ON "Medicine"("name");

-- CreateIndex
CREATE INDEX "Medicine_category_idx" ON "Medicine"("category");

-- CreateIndex
CREATE INDEX "Medicine_stockUnits_idx" ON "Medicine"("stockUnits");

-- CreateIndex
CREATE INDEX "DispenseLog_medicineId_idx" ON "DispenseLog"("medicineId");

-- CreateIndex
CREATE INDEX "DispenseLog_patientId_idx" ON "DispenseLog"("patientId");

-- CreateIndex
CREATE INDEX "DispenseLog_dispensedAt_idx" ON "DispenseLog"("dispensedAt");

-- CreateIndex
CREATE INDEX "MedicineOrder_patientId_idx" ON "MedicineOrder"("patientId");

-- CreateIndex
CREATE INDEX "MedicineOrder_status_idx" ON "MedicineOrder"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Bill_admissionId_key" ON "Bill"("admissionId");

-- CreateIndex
CREATE INDEX "Bill_patientId_idx" ON "Bill"("patientId");

-- CreateIndex
CREATE INDEX "Bill_status_idx" ON "Bill"("status");

-- CreateIndex
CREATE INDEX "Bill_generatedAt_idx" ON "Bill"("generatedAt");

-- CreateIndex
CREATE INDEX "Payment_billId_idx" ON "Payment"("billId");

-- CreateIndex
CREATE INDEX "Emergency_status_idx" ON "Emergency"("status");

-- CreateIndex
CREATE INDEX "Emergency_createdAt_idx" ON "Emergency"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Ambulance_vehicleNumber_key" ON "Ambulance"("vehicleNumber");

-- CreateIndex
CREATE INDEX "Ambulance_status_idx" ON "Ambulance"("status");

-- CreateIndex
CREATE INDEX "AmbulanceTracking_ambulanceId_idx" ON "AmbulanceTracking"("ambulanceId");

-- CreateIndex
CREATE INDEX "AmbulanceTracking_recordedAt_idx" ON "AmbulanceTracking"("recordedAt");

-- CreateIndex
CREATE INDEX "BloodDonor_bloodGroup_idx" ON "BloodDonor"("bloodGroup");

-- CreateIndex
CREATE INDEX "BloodDonor_isAvailable_idx" ON "BloodDonor"("isAvailable");

-- CreateIndex
CREATE UNIQUE INDEX "BloodInventory_bloodGroup_key" ON "BloodInventory"("bloodGroup");

-- CreateIndex
CREATE INDEX "BloodRequest_bloodGroup_idx" ON "BloodRequest"("bloodGroup");

-- CreateIndex
CREATE INDEX "BloodRequest_status_idx" ON "BloodRequest"("status");

-- CreateIndex
CREATE INDEX "Shift_doctorId_idx" ON "Shift"("doctorId");

-- CreateIndex
CREATE INDEX "Shift_staffId_idx" ON "Shift"("staffId");

-- CreateIndex
CREATE INDEX "Shift_startTime_idx" ON "Shift"("startTime");

-- CreateIndex
CREATE INDEX "Notification_patientId_idx" ON "Notification"("patientId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_riskScore_idx" ON "AuditLog"("riskScore");

-- CreateIndex
CREATE INDEX "AuditLog_flagged_idx" ON "AuditLog"("flagged");

-- CreateIndex
CREATE INDEX "AuditLog_module_idx" ON "AuditLog"("module");

-- CreateIndex
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");

-- CreateIndex
CREATE INDEX "UserSession_isActive_idx" ON "UserSession"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "BehaviorProfile_userId_key" ON "BehaviorProfile"("userId");

-- AddForeignKey
ALTER TABLE "PatientHistory" ADD CONSTRAINT "PatientHistory_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Doctor" ADD CONSTRAINT "Doctor_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorLeave" ADD CONSTRAINT "DoctorLeave_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bed" ADD CONSTRAINT "Bed_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES "Bed"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionMedicine" ADD CONSTRAINT "PrescriptionMedicine_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionMedicine" ADD CONSTRAINT "PrescriptionMedicine_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DietPlan" ADD CONSTRAINT "DietPlan_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabReport" ADD CONSTRAINT "LabReport_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabReport" ADD CONSTRAINT "LabReport_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitalsReading" ADD CONSTRAINT "VitalsReading_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitalsReading" ADD CONSTRAINT "VitalsReading_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES "Bed"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitalsReading" ADD CONSTRAINT "VitalsReading_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispenseLog" ADD CONSTRAINT "DispenseLog_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispenseLog" ADD CONSTRAINT "DispenseLog_dispensedById_fkey" FOREIGN KEY ("dispensedById") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineOrder" ADD CONSTRAINT "MedicineOrder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineOrderItem" ADD CONSTRAINT "MedicineOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "MedicineOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicineOrderItem" ADD CONSTRAINT "MedicineOrderItem_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "Medicine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillItem" ADD CONSTRAINT "BillItem_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Emergency" ADD CONSTRAINT "Emergency_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Emergency" ADD CONSTRAINT "Emergency_ambulanceId_fkey" FOREIGN KEY ("ambulanceId") REFERENCES "Ambulance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmbulanceTracking" ADD CONSTRAINT "AmbulanceTracking_ambulanceId_fkey" FOREIGN KEY ("ambulanceId") REFERENCES "Ambulance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
