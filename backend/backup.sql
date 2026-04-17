--
-- PostgreSQL database dump
--

\restrict x7UtfaiqanE47ZJFZVm31JHEPOd6acZwJJXAsgguxx39buawVzRPSfFtyRupprF

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: StaffRole; Type: TYPE; Schema: public; Owner: bhanu
--

CREATE TYPE public."StaffRole" AS ENUM (
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


ALTER TYPE public."StaffRole" OWNER TO bhanu;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Admission; Type: TABLE; Schema: public; Owner: bhanu
--

CREATE TABLE public."Admission" (
    id text NOT NULL,
    "patientId" text NOT NULL,
    "doctorId" text NOT NULL,
    "bedId" text NOT NULL,
    "admissionType" text NOT NULL,
    "admissionReason" text NOT NULL,
    diagnosis text,
    "admittedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dischargedAt" timestamp(3) without time zone,
    "dischargeSummary" text,
    "followUpDate" timestamp(3) without time zone,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Admission" OWNER TO bhanu;

--
-- Name: Ambulance; Type: TABLE; Schema: public; Owner: bhanu
--

CREATE TABLE public."Ambulance" (
    id text NOT NULL,
    "vehicleNumber" text NOT NULL,
    "driverName" text NOT NULL,
    "driverPhone" text NOT NULL,
    "currentLat" double precision NOT NULL,
    "currentLng" double precision NOT NULL,
    status text DEFAULT 'available'::text NOT NULL,
    "equipmentType" text DEFAULT 'basic'::text NOT NULL,
    "hospitalId" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Ambulance" OWNER TO bhanu;

--
-- Name: AmbulanceTracking; Type: TABLE; Schema: public; Owner: bhanu
--

CREATE TABLE public."AmbulanceTracking" (
    id text NOT NULL,
    "ambulanceId" text NOT NULL,
    "requestId" text,
    lat double precision NOT NULL,
    lng double precision NOT NULL,
    speed double precision,
    "recordedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AmbulanceTracking" OWNER TO bhanu;

--
-- Name: Appointment; Type: TABLE; Schema: public; Owner: bhanu
--

CREATE TABLE public."Appointment" (
    id text NOT NULL,
    "patientId" text NOT NULL,
    "doctorId" text NOT NULL,
    "scheduledAt" timestamp(3) without time zone NOT NULL,
    type text NOT NULL,
    status text DEFAULT 'confirmed'::text NOT NULL,
    reason text,
    notes text,
    "tokenNumber" integer,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Appointment" OWNER TO bhanu;

--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: bhanu
--

CREATE TABLE public."AuditLog" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "userName" text NOT NULL,
    "userRole" text NOT NULL,
    "patientId" text,
    action text NOT NULL,
    module text NOT NULL,
    "recordId" text,
    "oldValue" jsonb,
    "newValue" jsonb,
    "ipAddress" text NOT NULL,
    "deviceType" text,
    "deviceId" text,
    "userAgent" text,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "riskScore" integer DEFAULT 0 NOT NULL,
    flagged boolean DEFAULT false NOT NULL,
    "flagReason" text,
    "logHash" text,
    "previousHash" text,
    "staffId" text
);


ALTER TABLE public."AuditLog" OWNER TO bhanu;

--
-- Name: Bed; Type: TABLE; Schema: public; Owner: bhanu
--

CREATE TABLE public."Bed" (
    id text NOT NULL,
    "bedNumber" text NOT NULL,
    "roomId" text NOT NULL,
    status text DEFAULT 'available'::text NOT NULL,
    "currentPatientId" text
);


ALTER TABLE public."Bed" OWNER TO bhanu;

--
-- Name: BehaviorProfile; Type: TABLE; Schema: public; Owner: bhanu
--

CREATE TABLE public."BehaviorProfile" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "userRole" text NOT NULL,
    "avgKeystrokeSpeed" double precision,
    "avgTouchPressure" double precision,
    "avgSwipeSpeed" double precision,
    "loginTimingPattern" jsonb,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."BehaviorProfile" OWNER TO bhanu;

--
-- Name: Bill; Type: TABLE; Schema: public; Owner: bhanu
--

CREATE TABLE public."Bill" (
    id text NOT NULL,
    "patientId" text NOT NULL,
    "admissionId" text,
    "generatedById" text,
    "totalAmount" numeric(10,2) NOT NULL,
    "paidAmount" numeric(10,2) DEFAULT 0 NOT NULL,
    "discountAmount" numeric(10,2) DEFAULT 0 NOT NULL,
    "taxAmount" numeric(10,2) DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    "paymentMethod" text,
    "insuranceRef" text,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "generatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "paidAt" timestamp(3) without time zone
);


ALTER TABLE public."Bill" OWNER TO bhanu;

--
-- Name: BillItem; Type: TABLE; Schema: public; Owner: bhanu
--

CREATE TABLE public."BillItem" (
    id text NOT NULL,
    "billId" text NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    "unitPrice" numeric(10,2) NOT NULL,
    "totalPrice" numeric(10,2) NOT NULL
);


ALTER TABLE public."BillItem" OWNER TO bhanu;

--
-- Name: BloodDonor; Type: TABLE; Schema: public; Owner: bhanu
--

CREATE TABLE public."BloodDonor" (
    id text NOT NULL,
    name text NOT NULL,
    "bloodGroup" text NOT NULL,
    phone text NOT NULL,
    email text,
    latitude double precision,
    longitude double precision,
    city text,
    "isAvailable" boolean DEFAULT true NOT NULL,
    "lastDonationDate" timestamp(3) without time zone,
    "totalDonations" integer DEFAULT 0 NOT NULL,
    "healthConditions" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."BloodDonor" OWNER TO bhanu;

--
-- Name: BloodInventory; Type: TABLE; Schema: public; Owner: bhanu
--

CREATE TABLE public."BloodInventory" (
    id text NOT NULL,
    "bloodGroup" text NOT NULL,
    "unitsAvailable" integer DEFAULT 0 NOT NULL,
    "expiryDate" timestamp(3) without time zone,
    "lastUpdated" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."BloodInventory" OWNER TO bhanu;

--
-- Name: BloodRequest; Type: TABLE; Schema: public; Owner: bhanu
--

CREATE TABLE public."BloodRequest" (
    id text NOT NULL,
    "patientId" text,
    "bloodGroup" text NOT NULL,
    "unitsNeeded" integer NOT NULL,
    urgency text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    "requestedBy" text,
    "fulfilledAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."BloodRequest" OWNER TO bhanu;

--
-- Name: Department; Type: TABLE; Schema: public; Owner: bhanu
--

CREATE TABLE public."Department" (
    id text NOT NULL,
    name text NOT NULL,
    floor integer,
    "totalBeds" integer DEFAULT 0 NOT NULL,
    "headDoctorId" text,
    phone text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Department" OWNER TO bhanu;

--
-- Name: DietPlan; Type: TABLE; Schema: public; Owner: bhanu
--

CREATE TABLE public."DietPlan" (
    id text NOT NULL,
    "prescriptionId" text NOT NULL,
    "patientId" text NOT NULL,
    "foodsToEat" text[],
    "foodsToAvoid" text[],
    "mealTiming" jsonb NOT NULL,
    "waterIntake" text,
    "specialNotes" text,
    "generatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."DietPlan" OWNER TO bhanu;

--
-- Name: DispenseLog; Type: TABLE; Schema: public; Owner: bhanu
--

CREATE TABLE public."DispenseLog" (
    id text NOT NULL,
    "medicineId" text NOT NULL,
    "patientId" text NOT NULL,
    "prescriptionId" text,
    quantity integer NOT NULL,
    "dispensedById" text NOT NULL,
    "dispensedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."DispenseLog" OWNER TO bhanu;

--
-- Name: Doctor; Type: TABLE; Schema: public; Owner: bhanu
--

CREATE TABLE public."Doctor" (
    id text NOT NULL,
    "doctorCode" text NOT NULL,
    "firstName" text NOT NULL,
    "lastName" text NOT NULL,
    "profilePhoto" text,
    specialization text NOT NULL,
    qualification text NOT NULL,
    "licenseNumber" text NOT NULL,
    "experienceYears" integer DEFAULT 0 NOT NULL,
    "departmentId" text,
    phone bytea NOT NULL,
    email bytea NOT NULL,
    "passwordHash" text NOT NULL,
    "consultationFee" numeric(10,2) DEFAULT 0 NOT NULL,
    "availableDays" text[],
    "workStartTime" text DEFAULT '09:00'::text NOT NULL,
    "workEndTime" text DEFAULT '17:00'::text NOT NULL,
    "currentStatus" text DEFAULT 'available'::text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "joiningDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Doctor" OWNER TO bhanu;

--
-- Name: DoctorLeave; Type: TABLE; Schema: public; Owner: bhanu
--

CREATE TABLE public."DoctorLeave" (
    id text NOT NULL,
    "doctorId" text NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    reason text NOT NULL,
    approved boolean DEFAULT false NOT NULL,
    "approvedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."DoctorLeave" OWNER TO bhanu;

--
-- Name: DoctorSettings; Type: TABLE; Schema: public; Owner: bhanu
--

CREATE TABLE public."DoctorSettings" (
    id text NOT NULL,
    "doctorId" text NOT NULL,
    "preferredLanguage" text DEFAULT 'en'::text NOT NULL,
    "apptReminders" boolean DEFAULT true NOT NULL,
    "patientAlerts" boolean DEFAULT true NOT NULL,
    "labResultAlerts" boolean DEFAULT true NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."DoctorSettings" OWNER TO bhanu;

--
-- Name: Emergency; Type: TABLE; Schema: public; Owner: bhanu
--

CREATE TABLE public."Emergency" (
    id text NOT NULL,
    "patientId" text,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    address text,
    symptoms text[],
    status text DEFAULT 'requested'::text NOT NULL,
    "ambulanceId" text,
    "etaMinutes" integer,
    "medicalHistory" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "arrivedAt" timestamp(3) without time zone
);


ALTER TABLE public."Emergency" OWNER TO bhanu;

--
-- Name: HospitalSettings; Type: TABLE; Schema: public; Owner: bhanu
--

CREATE TABLE public."HospitalSettings" (
    id text NOT NULL,
    "hospitalName" text DEFAULT 'ArogyaSeva Medical Centre'::text NOT NULL,
    address text,
    phone text,
    email text,
    "registrationNo" text,
    "emergencyPhone" text,
    "workingHours" text,
    "logoUrl" text,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."HospitalSettings" OWNER TO bhanu;

--
-- Name: LabReport; Type: TABLE; Schema: public; Owner: bhanu
--

CREATE TABLE public."LabReport" (
    id text NOT NULL,
    "patientId" text NOT NULL,
    "doctorId" text,
    "testName" text NOT NULL,
    "testDate" timestamp(3) without time zone NOT NULL,
    "reportUrl" text,
    results jsonb,
    "referenceRange" jsonb,
    status text DEFAULT 'pending'::text NOT NULL,
    "technicianId" text,
    "aiSummary" text,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."LabReport" OWNER TO bhanu;

--
-- Name: Medicine; Type: TABLE; Schema: public; Owner: bhanu
--

CREATE TABLE public."Medicine" (
    id text NOT NULL,
    name text NOT NULL,
    "genericName" text,
    category text NOT NULL,
    unit text NOT NULL,
    "stockUnits" integer DEFAULT 0 NOT NULL,
    "reorderLevel" integer DEFAULT 100 NOT NULL,
    "unitPrice" numeric(10,2) NOT NULL,
    "expiryDate" timestamp(3) without time zone,
    manufacturer text,
    "supplierId" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Medicine" OWNER TO bhanu;

--
-- Name: MedicineOrder; Type: TABLE; Schema: public; Owner: bhanu
--

CREATE TABLE public."MedicineOrder" (
    id text NOT NULL,
    "patientId" text NOT NULL,
    status text DEFAULT 'placed'::text NOT NULL,
    "deliveryAddress" text NOT NULL,
    "totalAmount" numeric(10,2) NOT NULL,
    "paymentMethod" text NOT NULL,
    "paymentStatus" text DEFAULT 'pending'::text NOT NULL,
    "estimatedMins" integer DEFAULT 20 NOT NULL,
    "orderedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deliveredAt" timestamp(3) without time zone
);


ALTER TABLE public."MedicineOrder" OWNER TO bhanu;

--
-- Name: MedicineOrderItem; Type: TABLE; Schema: public; Owner: bhanu
--

CREATE TABLE public."MedicineOrderItem" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "medicineId" text NOT NULL,
    quantity integer NOT NULL,
    "unitPrice" numeric(10,2) NOT NULL,
    "totalPrice" numeric(10,2) NOT NULL
);


ALTER TABLE public."MedicineOrderItem" OWNER TO bhanu;

--
-- Name: Notification; Type: TABLE; Schema: public; Owner: bhanu
--

CREATE TABLE public."Notification" (
    id text NOT NULL,
    "patientId" text,
    "staffId" text,
    "doctorId" text,
    title text NOT NULL,
    message text NOT NULL,
    type text NOT NULL,
    "isRead" boolean DEFAULT false NOT NULL,
    "sentVia" text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Notification" OWNER TO bhanu;

--
-- Name: Patient; Type: TABLE; Schema: public; Owner: bhanu
--

CREATE TABLE public."Patient" (
    id text NOT NULL,
    "patientId" text NOT NULL,
    "abhaId" text,
    "firstName" bytea NOT NULL,
    "lastName" bytea NOT NULL,
    "dateOfBirth" timestamp(3) without time zone NOT NULL,
    gender text NOT NULL,
    "bloodGroup" text,
    phone bytea NOT NULL,
    email bytea,
    address bytea,
    "emergencyContact" bytea,
    "emergencyPhone" bytea,
    "passwordHash" text NOT NULL,
    "profilePhoto" text,
    allergies text[],
    "chronicConditions" text[],
    height double precision,
    weight double precision,
    "isSmoker" boolean DEFAULT false NOT NULL,
    "preferredLanguage" text DEFAULT 'en'::text NOT NULL,
    theme text DEFAULT 'light'::text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Patient" OWNER TO bhanu;

--
-- Name: PatientHistory; Type: TABLE; Schema: public; Owner: bhanu
--

CREATE TABLE public."PatientHistory" (
    id text NOT NULL,
    "patientId" text NOT NULL,
    "visitDate" timestamp(3) without time zone NOT NULL,
    diagnosis text NOT NULL,
    treatment text,
    "doctorId" text,
    "hospitalName" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."PatientHistory" OWNER TO bhanu;

--
-- Name: PatientSettings; Type: TABLE; Schema: public; Owner: bhanu
--

CREATE TABLE public."PatientSettings" (
    id text NOT NULL,
    "patientId" text NOT NULL,
    "apptReminders" boolean DEFAULT true NOT NULL,
    "medicineReminders" boolean DEFAULT true NOT NULL,
    "billAlerts" boolean DEFAULT true NOT NULL,
    "reportReady" boolean DEFAULT true NOT NULL,
    "whatsappNotifs" boolean DEFAULT true NOT NULL,
    "emailNotifs" boolean DEFAULT false NOT NULL,
    "reminderMinutes" integer DEFAULT 30 NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."PatientSettings" OWNER TO bhanu;

--
-- Name: Payment; Type: TABLE; Schema: public; Owner: bhanu
--

CREATE TABLE public."Payment" (
    id text NOT NULL,
    "billId" text NOT NULL,
    amount numeric(10,2) NOT NULL,
    method text NOT NULL,
    "transactionId" text,
    "paidAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Payment" OWNER TO bhanu;

--
-- Name: Prescription; Type: TABLE; Schema: public; Owner: bhanu
--

CREATE TABLE public."Prescription" (
    id text NOT NULL,
    "patientId" text NOT NULL,
    "doctorId" text NOT NULL,
    "imageUrl" text,
    "rawOcrText" text,
    diagnosis text,
    "isAiScanned" boolean DEFAULT false NOT NULL,
    language text DEFAULT 'en'::text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Prescription" OWNER TO bhanu;

--
-- Name: PrescriptionMedicine; Type: TABLE; Schema: public; Owner: bhanu
--

CREATE TABLE public."PrescriptionMedicine" (
    id text NOT NULL,
    "prescriptionId" text NOT NULL,
    "medicineName" text NOT NULL,
    "genericName" text,
    dosage text NOT NULL,
    frequency text NOT NULL,
    timing text NOT NULL,
    "durationDays" integer NOT NULL,
    purpose text,
    "sideEffects" text,
    "medicineId" text
);


ALTER TABLE public."PrescriptionMedicine" OWNER TO bhanu;

--
-- Name: Room; Type: TABLE; Schema: public; Owner: bhanu
--

CREATE TABLE public."Room" (
    id text NOT NULL,
    "roomNumber" text NOT NULL,
    floor integer NOT NULL,
    "departmentId" text NOT NULL,
    type text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL
);


ALTER TABLE public."Room" OWNER TO bhanu;

--
-- Name: Shift; Type: TABLE; Schema: public; Owner: bhanu
--

CREATE TABLE public."Shift" (
    id text NOT NULL,
    "doctorId" text,
    "staffId" text,
    "departmentId" text,
    role text NOT NULL,
    "shiftType" text NOT NULL,
    "startTime" timestamp(3) without time zone NOT NULL,
    "endTime" timestamp(3) without time zone NOT NULL,
    "actualLogin" timestamp(3) without time zone,
    "actualLogout" timestamp(3) without time zone,
    "isPresent" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Shift" OWNER TO bhanu;

--
-- Name: Staff; Type: TABLE; Schema: public; Owner: bhanu
--

CREATE TABLE public."Staff" (
    id text NOT NULL,
    "staffId" text NOT NULL,
    "firstName" text NOT NULL,
    "lastName" text NOT NULL,
    "profilePhoto" text,
    role public."StaffRole" NOT NULL,
    "departmentId" text,
    phone bytea NOT NULL,
    email bytea NOT NULL,
    "passwordHash" text NOT NULL,
    qualification text,
    "experienceYears" integer DEFAULT 0 NOT NULL,
    "joiningDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    salary numeric(10,2),
    "isActive" boolean DEFAULT true NOT NULL,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Staff" OWNER TO bhanu;

--
-- Name: StaffSettings; Type: TABLE; Schema: public; Owner: bhanu
--

CREATE TABLE public."StaffSettings" (
    id text NOT NULL,
    "staffId" text NOT NULL,
    "preferredLanguage" text DEFAULT 'en'::text NOT NULL,
    notifications boolean DEFAULT true NOT NULL,
    theme text DEFAULT 'light'::text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."StaffSettings" OWNER TO bhanu;

--
-- Name: UserSession; Type: TABLE; Schema: public; Owner: bhanu
--

CREATE TABLE public."UserSession" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "userRole" text NOT NULL,
    "deviceInfo" text,
    "ipAddress" text NOT NULL,
    location text,
    "loginAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastActive" timestamp(3) without time zone NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "refreshToken" text
);


ALTER TABLE public."UserSession" OWNER TO bhanu;

--
-- Name: VitalsReading; Type: TABLE; Schema: public; Owner: bhanu
--

CREATE TABLE public."VitalsReading" (
    id text NOT NULL,
    "patientId" text NOT NULL,
    "bedId" text,
    "admissionId" text,
    "heartRate" integer,
    "bloodPressure" text,
    "spO2" integer,
    temperature double precision,
    "respiratoryRate" integer,
    "bloodSugar" double precision,
    source text DEFAULT 'manual'::text NOT NULL,
    "recordedBy" text,
    "recordedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."VitalsReading" OWNER TO bhanu;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: bhanu
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO bhanu;

--
-- Data for Name: Admission; Type: TABLE DATA; Schema: public; Owner: bhanu
--

COPY public."Admission" (id, "patientId", "doctorId", "bedId", "admissionType", "admissionReason", diagnosis, "admittedAt", "dischargedAt", "dischargeSummary", "followUpDate", "isDeleted", "createdAt") FROM stdin;
\.


--
-- Data for Name: Ambulance; Type: TABLE DATA; Schema: public; Owner: bhanu
--

COPY public."Ambulance" (id, "vehicleNumber", "driverName", "driverPhone", "currentLat", "currentLng", status, "equipmentType", "hospitalId", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: AmbulanceTracking; Type: TABLE DATA; Schema: public; Owner: bhanu
--

COPY public."AmbulanceTracking" (id, "ambulanceId", "requestId", lat, lng, speed, "recordedAt") FROM stdin;
\.


--
-- Data for Name: Appointment; Type: TABLE DATA; Schema: public; Owner: bhanu
--

COPY public."Appointment" (id, "patientId", "doctorId", "scheduledAt", type, status, reason, notes, "tokenNumber", "isDeleted", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: bhanu
--

COPY public."AuditLog" (id, "userId", "userName", "userRole", "patientId", action, module, "recordId", "oldValue", "newValue", "ipAddress", "deviceType", "deviceId", "userAgent", "timestamp", "riskScore", flagged, "flagReason", "logHash", "previousHash", "staffId") FROM stdin;
\.


--
-- Data for Name: Bed; Type: TABLE DATA; Schema: public; Owner: bhanu
--

COPY public."Bed" (id, "bedNumber", "roomId", status, "currentPatientId") FROM stdin;
\.


--
-- Data for Name: BehaviorProfile; Type: TABLE DATA; Schema: public; Owner: bhanu
--

COPY public."BehaviorProfile" (id, "userId", "userRole", "avgKeystrokeSpeed", "avgTouchPressure", "avgSwipeSpeed", "loginTimingPattern", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Bill; Type: TABLE DATA; Schema: public; Owner: bhanu
--

COPY public."Bill" (id, "patientId", "admissionId", "generatedById", "totalAmount", "paidAmount", "discountAmount", "taxAmount", status, "paymentMethod", "insuranceRef", "isDeleted", "generatedAt", "paidAt") FROM stdin;
\.


--
-- Data for Name: BillItem; Type: TABLE DATA; Schema: public; Owner: bhanu
--

COPY public."BillItem" (id, "billId", description, category, quantity, "unitPrice", "totalPrice") FROM stdin;
\.


--
-- Data for Name: BloodDonor; Type: TABLE DATA; Schema: public; Owner: bhanu
--

COPY public."BloodDonor" (id, name, "bloodGroup", phone, email, latitude, longitude, city, "isAvailable", "lastDonationDate", "totalDonations", "healthConditions", "isActive", "createdAt") FROM stdin;
\.


--
-- Data for Name: BloodInventory; Type: TABLE DATA; Schema: public; Owner: bhanu
--

COPY public."BloodInventory" (id, "bloodGroup", "unitsAvailable", "expiryDate", "lastUpdated") FROM stdin;
\.


--
-- Data for Name: BloodRequest; Type: TABLE DATA; Schema: public; Owner: bhanu
--

COPY public."BloodRequest" (id, "patientId", "bloodGroup", "unitsNeeded", urgency, status, "requestedBy", "fulfilledAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: Department; Type: TABLE DATA; Schema: public; Owner: bhanu
--

COPY public."Department" (id, name, floor, "totalBeds", "headDoctorId", phone, "isActive", "createdAt") FROM stdin;
\.


--
-- Data for Name: DietPlan; Type: TABLE DATA; Schema: public; Owner: bhanu
--

COPY public."DietPlan" (id, "prescriptionId", "patientId", "foodsToEat", "foodsToAvoid", "mealTiming", "waterIntake", "specialNotes", "generatedAt") FROM stdin;
\.


--
-- Data for Name: DispenseLog; Type: TABLE DATA; Schema: public; Owner: bhanu
--

COPY public."DispenseLog" (id, "medicineId", "patientId", "prescriptionId", quantity, "dispensedById", "dispensedAt") FROM stdin;
\.


--
-- Data for Name: Doctor; Type: TABLE DATA; Schema: public; Owner: bhanu
--

COPY public."Doctor" (id, "doctorCode", "firstName", "lastName", "profilePhoto", specialization, qualification, "licenseNumber", "experienceYears", "departmentId", phone, email, "passwordHash", "consultationFee", "availableDays", "workStartTime", "workEndTime", "currentStatus", "isActive", "isDeleted", "joiningDate", "deletedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: DoctorLeave; Type: TABLE DATA; Schema: public; Owner: bhanu
--

COPY public."DoctorLeave" (id, "doctorId", "startDate", "endDate", reason, approved, "approvedBy", "createdAt") FROM stdin;
\.


--
-- Data for Name: DoctorSettings; Type: TABLE DATA; Schema: public; Owner: bhanu
--

COPY public."DoctorSettings" (id, "doctorId", "preferredLanguage", "apptReminders", "patientAlerts", "labResultAlerts", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Emergency; Type: TABLE DATA; Schema: public; Owner: bhanu
--

COPY public."Emergency" (id, "patientId", latitude, longitude, address, symptoms, status, "ambulanceId", "etaMinutes", "medicalHistory", "createdAt", "arrivedAt") FROM stdin;
\.


--
-- Data for Name: HospitalSettings; Type: TABLE DATA; Schema: public; Owner: bhanu
--

COPY public."HospitalSettings" (id, "hospitalName", address, phone, email, "registrationNo", "emergencyPhone", "workingHours", "logoUrl", "updatedAt") FROM stdin;
\.


--
-- Data for Name: LabReport; Type: TABLE DATA; Schema: public; Owner: bhanu
--

COPY public."LabReport" (id, "patientId", "doctorId", "testName", "testDate", "reportUrl", results, "referenceRange", status, "technicianId", "aiSummary", "isDeleted", "createdAt") FROM stdin;
\.


--
-- Data for Name: Medicine; Type: TABLE DATA; Schema: public; Owner: bhanu
--

COPY public."Medicine" (id, name, "genericName", category, unit, "stockUnits", "reorderLevel", "unitPrice", "expiryDate", manufacturer, "supplierId", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: MedicineOrder; Type: TABLE DATA; Schema: public; Owner: bhanu
--

COPY public."MedicineOrder" (id, "patientId", status, "deliveryAddress", "totalAmount", "paymentMethod", "paymentStatus", "estimatedMins", "orderedAt", "deliveredAt") FROM stdin;
\.


--
-- Data for Name: MedicineOrderItem; Type: TABLE DATA; Schema: public; Owner: bhanu
--

COPY public."MedicineOrderItem" (id, "orderId", "medicineId", quantity, "unitPrice", "totalPrice") FROM stdin;
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: bhanu
--

COPY public."Notification" (id, "patientId", "staffId", "doctorId", title, message, type, "isRead", "sentVia", "createdAt") FROM stdin;
\.


--
-- Data for Name: Patient; Type: TABLE DATA; Schema: public; Owner: bhanu
--

COPY public."Patient" (id, "patientId", "abhaId", "firstName", "lastName", "dateOfBirth", gender, "bloodGroup", phone, email, address, "emergencyContact", "emergencyPhone", "passwordHash", "profilePhoto", allergies, "chronicConditions", height, weight, "isSmoker", "preferredLanguage", theme, "isActive", "isDeleted", "deletedAt", "createdAt", "updatedAt") FROM stdin;
ded7d3a9-088b-48f6-b47f-6da69f91f8a9	PAT003	\N	\\x34346264363966633437616263646165336536353563653633326535396234313a3565333138656566633132616366373734383462613032636239383635303663	\\x65643832356239633638316563666534373462333061336239613939653234383a3132323963616135626539616263313537633037313337656232613837303938	2004-01-01 00:00:00	male	\N	\\x32646465646263393431393037376439663131323536653339313337316365393a3636303766326534336632653438396166623030653862353234346336333662	\N	\N	\N	\N	123456	\N	{}	{}	\N	\N	f	en	light	t	f	\N	2026-04-13 11:05:22.207	2026-04-13 11:05:22.207
498c0f6c-d7f1-41b8-9aec-b0c822876304	PAT005	\N	\\x63623537353534363430323532653464656263653739663430373834396234663a3562313934643461633630303961326663316265336230383365393030653934	\\x35303661623937656461656236336232643433366233373539333930343233353a6637626230356335346632336135353732346466643034633366356162303065	2004-01-01 00:00:00	male	\N	\\x32396630323132323336663235306666336337653362636331393133303263383a3537656533373662626561636131633231373936366335663636656364646664	\N	\N	\N	\N	123456	\N	{}	{}	\N	\N	f	en	light	t	f	\N	2026-04-13 11:16:08.379	2026-04-13 11:16:08.379
\.


--
-- Data for Name: PatientHistory; Type: TABLE DATA; Schema: public; Owner: bhanu
--

COPY public."PatientHistory" (id, "patientId", "visitDate", diagnosis, treatment, "doctorId", "hospitalName", notes, "createdAt") FROM stdin;
\.


--
-- Data for Name: PatientSettings; Type: TABLE DATA; Schema: public; Owner: bhanu
--

COPY public."PatientSettings" (id, "patientId", "apptReminders", "medicineReminders", "billAlerts", "reportReady", "whatsappNotifs", "emailNotifs", "reminderMinutes", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Payment; Type: TABLE DATA; Schema: public; Owner: bhanu
--

COPY public."Payment" (id, "billId", amount, method, "transactionId", "paidAt") FROM stdin;
\.


--
-- Data for Name: Prescription; Type: TABLE DATA; Schema: public; Owner: bhanu
--

COPY public."Prescription" (id, "patientId", "doctorId", "imageUrl", "rawOcrText", diagnosis, "isAiScanned", language, "expiresAt", "isDeleted", "createdAt") FROM stdin;
\.


--
-- Data for Name: PrescriptionMedicine; Type: TABLE DATA; Schema: public; Owner: bhanu
--

COPY public."PrescriptionMedicine" (id, "prescriptionId", "medicineName", "genericName", dosage, frequency, timing, "durationDays", purpose, "sideEffects", "medicineId") FROM stdin;
\.


--
-- Data for Name: Room; Type: TABLE DATA; Schema: public; Owner: bhanu
--

COPY public."Room" (id, "roomNumber", floor, "departmentId", type, "isActive") FROM stdin;
\.


--
-- Data for Name: Shift; Type: TABLE DATA; Schema: public; Owner: bhanu
--

COPY public."Shift" (id, "doctorId", "staffId", "departmentId", role, "shiftType", "startTime", "endTime", "actualLogin", "actualLogout", "isPresent", "createdAt") FROM stdin;
\.


--
-- Data for Name: Staff; Type: TABLE DATA; Schema: public; Owner: bhanu
--

COPY public."Staff" (id, "staffId", "firstName", "lastName", "profilePhoto", role, "departmentId", phone, email, "passwordHash", qualification, "experienceYears", "joiningDate", salary, "isActive", "isDeleted", "deletedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: StaffSettings; Type: TABLE DATA; Schema: public; Owner: bhanu
--

COPY public."StaffSettings" (id, "staffId", "preferredLanguage", notifications, theme, "updatedAt") FROM stdin;
\.


--
-- Data for Name: UserSession; Type: TABLE DATA; Schema: public; Owner: bhanu
--

COPY public."UserSession" (id, "userId", "userRole", "deviceInfo", "ipAddress", location, "loginAt", "lastActive", "isActive", "refreshToken") FROM stdin;
\.


--
-- Data for Name: VitalsReading; Type: TABLE DATA; Schema: public; Owner: bhanu
--

COPY public."VitalsReading" (id, "patientId", "bedId", "admissionId", "heartRate", "bloodPressure", "spO2", temperature, "respiratoryRate", "bloodSugar", source, "recordedBy", "recordedAt") FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: bhanu
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
c2712176-de14-4dea-b101-eba0968280bd	20360171de4dcaefe94bf6bdada60480938dbe1ba67d2e6028bb21aa2dc1ad41	2026-04-13 15:52:35.696061+05:30	20260413102235_initial_setup	\N	\N	2026-04-13 15:52:35.439699+05:30	1
\.


--
-- Name: Admission Admission_pkey; Type: CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."Admission"
    ADD CONSTRAINT "Admission_pkey" PRIMARY KEY (id);


--
-- Name: AmbulanceTracking AmbulanceTracking_pkey; Type: CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."AmbulanceTracking"
    ADD CONSTRAINT "AmbulanceTracking_pkey" PRIMARY KEY (id);


--
-- Name: Ambulance Ambulance_pkey; Type: CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."Ambulance"
    ADD CONSTRAINT "Ambulance_pkey" PRIMARY KEY (id);


--
-- Name: Appointment Appointment_pkey; Type: CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."Appointment"
    ADD CONSTRAINT "Appointment_pkey" PRIMARY KEY (id);


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: Bed Bed_pkey; Type: CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."Bed"
    ADD CONSTRAINT "Bed_pkey" PRIMARY KEY (id);


--
-- Name: BehaviorProfile BehaviorProfile_pkey; Type: CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."BehaviorProfile"
    ADD CONSTRAINT "BehaviorProfile_pkey" PRIMARY KEY (id);


--
-- Name: BillItem BillItem_pkey; Type: CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."BillItem"
    ADD CONSTRAINT "BillItem_pkey" PRIMARY KEY (id);


--
-- Name: Bill Bill_pkey; Type: CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."Bill"
    ADD CONSTRAINT "Bill_pkey" PRIMARY KEY (id);


--
-- Name: BloodDonor BloodDonor_pkey; Type: CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."BloodDonor"
    ADD CONSTRAINT "BloodDonor_pkey" PRIMARY KEY (id);


--
-- Name: BloodInventory BloodInventory_pkey; Type: CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."BloodInventory"
    ADD CONSTRAINT "BloodInventory_pkey" PRIMARY KEY (id);


--
-- Name: BloodRequest BloodRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."BloodRequest"
    ADD CONSTRAINT "BloodRequest_pkey" PRIMARY KEY (id);


--
-- Name: Department Department_pkey; Type: CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."Department"
    ADD CONSTRAINT "Department_pkey" PRIMARY KEY (id);


--
-- Name: DietPlan DietPlan_pkey; Type: CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."DietPlan"
    ADD CONSTRAINT "DietPlan_pkey" PRIMARY KEY (id);


--
-- Name: DispenseLog DispenseLog_pkey; Type: CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."DispenseLog"
    ADD CONSTRAINT "DispenseLog_pkey" PRIMARY KEY (id);


--
-- Name: DoctorLeave DoctorLeave_pkey; Type: CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."DoctorLeave"
    ADD CONSTRAINT "DoctorLeave_pkey" PRIMARY KEY (id);


--
-- Name: DoctorSettings DoctorSettings_pkey; Type: CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."DoctorSettings"
    ADD CONSTRAINT "DoctorSettings_pkey" PRIMARY KEY (id);


--
-- Name: Doctor Doctor_pkey; Type: CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."Doctor"
    ADD CONSTRAINT "Doctor_pkey" PRIMARY KEY (id);


--
-- Name: Emergency Emergency_pkey; Type: CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."Emergency"
    ADD CONSTRAINT "Emergency_pkey" PRIMARY KEY (id);


--
-- Name: HospitalSettings HospitalSettings_pkey; Type: CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."HospitalSettings"
    ADD CONSTRAINT "HospitalSettings_pkey" PRIMARY KEY (id);


--
-- Name: LabReport LabReport_pkey; Type: CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."LabReport"
    ADD CONSTRAINT "LabReport_pkey" PRIMARY KEY (id);


--
-- Name: MedicineOrderItem MedicineOrderItem_pkey; Type: CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."MedicineOrderItem"
    ADD CONSTRAINT "MedicineOrderItem_pkey" PRIMARY KEY (id);


--
-- Name: MedicineOrder MedicineOrder_pkey; Type: CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."MedicineOrder"
    ADD CONSTRAINT "MedicineOrder_pkey" PRIMARY KEY (id);


--
-- Name: Medicine Medicine_pkey; Type: CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."Medicine"
    ADD CONSTRAINT "Medicine_pkey" PRIMARY KEY (id);


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);


--
-- Name: PatientHistory PatientHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."PatientHistory"
    ADD CONSTRAINT "PatientHistory_pkey" PRIMARY KEY (id);


--
-- Name: PatientSettings PatientSettings_pkey; Type: CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."PatientSettings"
    ADD CONSTRAINT "PatientSettings_pkey" PRIMARY KEY (id);


--
-- Name: Patient Patient_pkey; Type: CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."Patient"
    ADD CONSTRAINT "Patient_pkey" PRIMARY KEY (id);


--
-- Name: Payment Payment_pkey; Type: CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_pkey" PRIMARY KEY (id);


--
-- Name: PrescriptionMedicine PrescriptionMedicine_pkey; Type: CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."PrescriptionMedicine"
    ADD CONSTRAINT "PrescriptionMedicine_pkey" PRIMARY KEY (id);


--
-- Name: Prescription Prescription_pkey; Type: CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."Prescription"
    ADD CONSTRAINT "Prescription_pkey" PRIMARY KEY (id);


--
-- Name: Room Room_pkey; Type: CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."Room"
    ADD CONSTRAINT "Room_pkey" PRIMARY KEY (id);


--
-- Name: Shift Shift_pkey; Type: CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."Shift"
    ADD CONSTRAINT "Shift_pkey" PRIMARY KEY (id);


--
-- Name: StaffSettings StaffSettings_pkey; Type: CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."StaffSettings"
    ADD CONSTRAINT "StaffSettings_pkey" PRIMARY KEY (id);


--
-- Name: Staff Staff_pkey; Type: CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."Staff"
    ADD CONSTRAINT "Staff_pkey" PRIMARY KEY (id);


--
-- Name: UserSession UserSession_pkey; Type: CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."UserSession"
    ADD CONSTRAINT "UserSession_pkey" PRIMARY KEY (id);


--
-- Name: VitalsReading VitalsReading_pkey; Type: CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."VitalsReading"
    ADD CONSTRAINT "VitalsReading_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Admission_admittedAt_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "Admission_admittedAt_idx" ON public."Admission" USING btree ("admittedAt");


--
-- Name: Admission_doctorId_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "Admission_doctorId_idx" ON public."Admission" USING btree ("doctorId");


--
-- Name: Admission_patientId_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "Admission_patientId_idx" ON public."Admission" USING btree ("patientId");


--
-- Name: AmbulanceTracking_ambulanceId_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "AmbulanceTracking_ambulanceId_idx" ON public."AmbulanceTracking" USING btree ("ambulanceId");


--
-- Name: AmbulanceTracking_recordedAt_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "AmbulanceTracking_recordedAt_idx" ON public."AmbulanceTracking" USING btree ("recordedAt");


--
-- Name: Ambulance_status_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "Ambulance_status_idx" ON public."Ambulance" USING btree (status);


--
-- Name: Ambulance_vehicleNumber_key; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE UNIQUE INDEX "Ambulance_vehicleNumber_key" ON public."Ambulance" USING btree ("vehicleNumber");


--
-- Name: Appointment_doctorId_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "Appointment_doctorId_idx" ON public."Appointment" USING btree ("doctorId");


--
-- Name: Appointment_patientId_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "Appointment_patientId_idx" ON public."Appointment" USING btree ("patientId");


--
-- Name: Appointment_scheduledAt_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "Appointment_scheduledAt_idx" ON public."Appointment" USING btree ("scheduledAt");


--
-- Name: Appointment_status_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "Appointment_status_idx" ON public."Appointment" USING btree (status);


--
-- Name: AuditLog_flagged_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "AuditLog_flagged_idx" ON public."AuditLog" USING btree (flagged);


--
-- Name: AuditLog_module_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "AuditLog_module_idx" ON public."AuditLog" USING btree (module);


--
-- Name: AuditLog_riskScore_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "AuditLog_riskScore_idx" ON public."AuditLog" USING btree ("riskScore");


--
-- Name: AuditLog_timestamp_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "AuditLog_timestamp_idx" ON public."AuditLog" USING btree ("timestamp");


--
-- Name: AuditLog_userId_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "AuditLog_userId_idx" ON public."AuditLog" USING btree ("userId");


--
-- Name: Bed_roomId_bedNumber_key; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE UNIQUE INDEX "Bed_roomId_bedNumber_key" ON public."Bed" USING btree ("roomId", "bedNumber");


--
-- Name: Bed_roomId_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "Bed_roomId_idx" ON public."Bed" USING btree ("roomId");


--
-- Name: Bed_status_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "Bed_status_idx" ON public."Bed" USING btree (status);


--
-- Name: BehaviorProfile_userId_key; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE UNIQUE INDEX "BehaviorProfile_userId_key" ON public."BehaviorProfile" USING btree ("userId");


--
-- Name: Bill_admissionId_key; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE UNIQUE INDEX "Bill_admissionId_key" ON public."Bill" USING btree ("admissionId");


--
-- Name: Bill_generatedAt_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "Bill_generatedAt_idx" ON public."Bill" USING btree ("generatedAt");


--
-- Name: Bill_patientId_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "Bill_patientId_idx" ON public."Bill" USING btree ("patientId");


--
-- Name: Bill_status_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "Bill_status_idx" ON public."Bill" USING btree (status);


--
-- Name: BloodDonor_bloodGroup_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "BloodDonor_bloodGroup_idx" ON public."BloodDonor" USING btree ("bloodGroup");


--
-- Name: BloodDonor_isAvailable_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "BloodDonor_isAvailable_idx" ON public."BloodDonor" USING btree ("isAvailable");


--
-- Name: BloodInventory_bloodGroup_key; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE UNIQUE INDEX "BloodInventory_bloodGroup_key" ON public."BloodInventory" USING btree ("bloodGroup");


--
-- Name: BloodRequest_bloodGroup_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "BloodRequest_bloodGroup_idx" ON public."BloodRequest" USING btree ("bloodGroup");


--
-- Name: BloodRequest_status_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "BloodRequest_status_idx" ON public."BloodRequest" USING btree (status);


--
-- Name: Department_name_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "Department_name_idx" ON public."Department" USING btree (name);


--
-- Name: Department_name_key; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE UNIQUE INDEX "Department_name_key" ON public."Department" USING btree (name);


--
-- Name: DietPlan_patientId_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "DietPlan_patientId_idx" ON public."DietPlan" USING btree ("patientId");


--
-- Name: DietPlan_prescriptionId_key; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE UNIQUE INDEX "DietPlan_prescriptionId_key" ON public."DietPlan" USING btree ("prescriptionId");


--
-- Name: DispenseLog_dispensedAt_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "DispenseLog_dispensedAt_idx" ON public."DispenseLog" USING btree ("dispensedAt");


--
-- Name: DispenseLog_medicineId_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "DispenseLog_medicineId_idx" ON public."DispenseLog" USING btree ("medicineId");


--
-- Name: DispenseLog_patientId_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "DispenseLog_patientId_idx" ON public."DispenseLog" USING btree ("patientId");


--
-- Name: DoctorLeave_doctorId_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "DoctorLeave_doctorId_idx" ON public."DoctorLeave" USING btree ("doctorId");


--
-- Name: DoctorSettings_doctorId_key; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE UNIQUE INDEX "DoctorSettings_doctorId_key" ON public."DoctorSettings" USING btree ("doctorId");


--
-- Name: Doctor_doctorCode_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "Doctor_doctorCode_idx" ON public."Doctor" USING btree ("doctorCode");


--
-- Name: Doctor_doctorCode_key; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE UNIQUE INDEX "Doctor_doctorCode_key" ON public."Doctor" USING btree ("doctorCode");


--
-- Name: Doctor_isDeleted_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "Doctor_isDeleted_idx" ON public."Doctor" USING btree ("isDeleted");


--
-- Name: Doctor_licenseNumber_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "Doctor_licenseNumber_idx" ON public."Doctor" USING btree ("licenseNumber");


--
-- Name: Doctor_licenseNumber_key; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE UNIQUE INDEX "Doctor_licenseNumber_key" ON public."Doctor" USING btree ("licenseNumber");


--
-- Name: Doctor_specialization_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "Doctor_specialization_idx" ON public."Doctor" USING btree (specialization);


--
-- Name: Emergency_createdAt_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "Emergency_createdAt_idx" ON public."Emergency" USING btree ("createdAt");


--
-- Name: Emergency_status_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "Emergency_status_idx" ON public."Emergency" USING btree (status);


--
-- Name: LabReport_patientId_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "LabReport_patientId_idx" ON public."LabReport" USING btree ("patientId");


--
-- Name: LabReport_status_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "LabReport_status_idx" ON public."LabReport" USING btree (status);


--
-- Name: MedicineOrder_patientId_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "MedicineOrder_patientId_idx" ON public."MedicineOrder" USING btree ("patientId");


--
-- Name: MedicineOrder_status_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "MedicineOrder_status_idx" ON public."MedicineOrder" USING btree (status);


--
-- Name: Medicine_category_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "Medicine_category_idx" ON public."Medicine" USING btree (category);


--
-- Name: Medicine_name_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "Medicine_name_idx" ON public."Medicine" USING btree (name);


--
-- Name: Medicine_stockUnits_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "Medicine_stockUnits_idx" ON public."Medicine" USING btree ("stockUnits");


--
-- Name: Notification_isRead_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "Notification_isRead_idx" ON public."Notification" USING btree ("isRead");


--
-- Name: Notification_patientId_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "Notification_patientId_idx" ON public."Notification" USING btree ("patientId");


--
-- Name: PatientHistory_patientId_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "PatientHistory_patientId_idx" ON public."PatientHistory" USING btree ("patientId");


--
-- Name: PatientHistory_visitDate_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "PatientHistory_visitDate_idx" ON public."PatientHistory" USING btree ("visitDate");


--
-- Name: PatientSettings_patientId_key; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE UNIQUE INDEX "PatientSettings_patientId_key" ON public."PatientSettings" USING btree ("patientId");


--
-- Name: Patient_abhaId_key; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE UNIQUE INDEX "Patient_abhaId_key" ON public."Patient" USING btree ("abhaId");


--
-- Name: Patient_bloodGroup_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "Patient_bloodGroup_idx" ON public."Patient" USING btree ("bloodGroup");


--
-- Name: Patient_createdAt_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "Patient_createdAt_idx" ON public."Patient" USING btree ("createdAt");


--
-- Name: Patient_isDeleted_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "Patient_isDeleted_idx" ON public."Patient" USING btree ("isDeleted");


--
-- Name: Patient_patientId_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "Patient_patientId_idx" ON public."Patient" USING btree ("patientId");


--
-- Name: Patient_patientId_key; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE UNIQUE INDEX "Patient_patientId_key" ON public."Patient" USING btree ("patientId");


--
-- Name: Patient_phone_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "Patient_phone_idx" ON public."Patient" USING btree (phone);


--
-- Name: Payment_billId_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "Payment_billId_idx" ON public."Payment" USING btree ("billId");


--
-- Name: PrescriptionMedicine_prescriptionId_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "PrescriptionMedicine_prescriptionId_idx" ON public."PrescriptionMedicine" USING btree ("prescriptionId");


--
-- Name: Prescription_createdAt_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "Prescription_createdAt_idx" ON public."Prescription" USING btree ("createdAt");


--
-- Name: Prescription_doctorId_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "Prescription_doctorId_idx" ON public."Prescription" USING btree ("doctorId");


--
-- Name: Prescription_patientId_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "Prescription_patientId_idx" ON public."Prescription" USING btree ("patientId");


--
-- Name: Room_departmentId_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "Room_departmentId_idx" ON public."Room" USING btree ("departmentId");


--
-- Name: Room_roomNumber_key; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE UNIQUE INDEX "Room_roomNumber_key" ON public."Room" USING btree ("roomNumber");


--
-- Name: Room_type_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "Room_type_idx" ON public."Room" USING btree (type);


--
-- Name: Shift_doctorId_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "Shift_doctorId_idx" ON public."Shift" USING btree ("doctorId");


--
-- Name: Shift_staffId_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "Shift_staffId_idx" ON public."Shift" USING btree ("staffId");


--
-- Name: Shift_startTime_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "Shift_startTime_idx" ON public."Shift" USING btree ("startTime");


--
-- Name: StaffSettings_staffId_key; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE UNIQUE INDEX "StaffSettings_staffId_key" ON public."StaffSettings" USING btree ("staffId");


--
-- Name: Staff_isDeleted_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "Staff_isDeleted_idx" ON public."Staff" USING btree ("isDeleted");


--
-- Name: Staff_role_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "Staff_role_idx" ON public."Staff" USING btree (role);


--
-- Name: Staff_staffId_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "Staff_staffId_idx" ON public."Staff" USING btree ("staffId");


--
-- Name: Staff_staffId_key; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE UNIQUE INDEX "Staff_staffId_key" ON public."Staff" USING btree ("staffId");


--
-- Name: UserSession_isActive_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "UserSession_isActive_idx" ON public."UserSession" USING btree ("isActive");


--
-- Name: UserSession_userId_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "UserSession_userId_idx" ON public."UserSession" USING btree ("userId");


--
-- Name: VitalsReading_patientId_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "VitalsReading_patientId_idx" ON public."VitalsReading" USING btree ("patientId");


--
-- Name: VitalsReading_recordedAt_idx; Type: INDEX; Schema: public; Owner: bhanu
--

CREATE INDEX "VitalsReading_recordedAt_idx" ON public."VitalsReading" USING btree ("recordedAt");


--
-- Name: Admission Admission_bedId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."Admission"
    ADD CONSTRAINT "Admission_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES public."Bed"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Admission Admission_doctorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."Admission"
    ADD CONSTRAINT "Admission_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES public."Doctor"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Admission Admission_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."Admission"
    ADD CONSTRAINT "Admission_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public."Patient"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AmbulanceTracking AmbulanceTracking_ambulanceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."AmbulanceTracking"
    ADD CONSTRAINT "AmbulanceTracking_ambulanceId_fkey" FOREIGN KEY ("ambulanceId") REFERENCES public."Ambulance"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Appointment Appointment_doctorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."Appointment"
    ADD CONSTRAINT "Appointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES public."Doctor"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Appointment Appointment_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."Appointment"
    ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public."Patient"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: AuditLog AuditLog_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public."Patient"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AuditLog AuditLog_staffId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES public."Staff"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Bed Bed_roomId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."Bed"
    ADD CONSTRAINT "Bed_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES public."Room"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: BillItem BillItem_billId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."BillItem"
    ADD CONSTRAINT "BillItem_billId_fkey" FOREIGN KEY ("billId") REFERENCES public."Bill"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Bill Bill_admissionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."Bill"
    ADD CONSTRAINT "Bill_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES public."Admission"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Bill Bill_generatedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."Bill"
    ADD CONSTRAINT "Bill_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES public."Staff"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Bill Bill_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."Bill"
    ADD CONSTRAINT "Bill_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public."Patient"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DietPlan DietPlan_prescriptionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."DietPlan"
    ADD CONSTRAINT "DietPlan_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES public."Prescription"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DispenseLog DispenseLog_dispensedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."DispenseLog"
    ADD CONSTRAINT "DispenseLog_dispensedById_fkey" FOREIGN KEY ("dispensedById") REFERENCES public."Staff"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DispenseLog DispenseLog_medicineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."DispenseLog"
    ADD CONSTRAINT "DispenseLog_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES public."Medicine"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DoctorLeave DoctorLeave_doctorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."DoctorLeave"
    ADD CONSTRAINT "DoctorLeave_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES public."Doctor"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Doctor Doctor_departmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."Doctor"
    ADD CONSTRAINT "Doctor_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public."Department"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Emergency Emergency_ambulanceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."Emergency"
    ADD CONSTRAINT "Emergency_ambulanceId_fkey" FOREIGN KEY ("ambulanceId") REFERENCES public."Ambulance"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Emergency Emergency_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."Emergency"
    ADD CONSTRAINT "Emergency_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public."Patient"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: LabReport LabReport_doctorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."LabReport"
    ADD CONSTRAINT "LabReport_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES public."Doctor"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: LabReport LabReport_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."LabReport"
    ADD CONSTRAINT "LabReport_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public."Patient"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MedicineOrderItem MedicineOrderItem_medicineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."MedicineOrderItem"
    ADD CONSTRAINT "MedicineOrderItem_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES public."Medicine"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MedicineOrderItem MedicineOrderItem_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."MedicineOrderItem"
    ADD CONSTRAINT "MedicineOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."MedicineOrder"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MedicineOrder MedicineOrder_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."MedicineOrder"
    ADD CONSTRAINT "MedicineOrder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public."Patient"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Notification Notification_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public."Patient"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PatientHistory PatientHistory_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."PatientHistory"
    ADD CONSTRAINT "PatientHistory_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public."Patient"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Payment Payment_billId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_billId_fkey" FOREIGN KEY ("billId") REFERENCES public."Bill"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PrescriptionMedicine PrescriptionMedicine_medicineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."PrescriptionMedicine"
    ADD CONSTRAINT "PrescriptionMedicine_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES public."Medicine"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PrescriptionMedicine PrescriptionMedicine_prescriptionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."PrescriptionMedicine"
    ADD CONSTRAINT "PrescriptionMedicine_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES public."Prescription"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Prescription Prescription_doctorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."Prescription"
    ADD CONSTRAINT "Prescription_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES public."Doctor"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Prescription Prescription_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."Prescription"
    ADD CONSTRAINT "Prescription_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public."Patient"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Room Room_departmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."Room"
    ADD CONSTRAINT "Room_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public."Department"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Shift Shift_doctorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."Shift"
    ADD CONSTRAINT "Shift_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES public."Doctor"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Shift Shift_staffId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."Shift"
    ADD CONSTRAINT "Shift_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES public."Staff"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Staff Staff_departmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."Staff"
    ADD CONSTRAINT "Staff_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public."Department"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: VitalsReading VitalsReading_admissionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."VitalsReading"
    ADD CONSTRAINT "VitalsReading_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES public."Admission"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: VitalsReading VitalsReading_bedId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."VitalsReading"
    ADD CONSTRAINT "VitalsReading_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES public."Bed"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: VitalsReading VitalsReading_patientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: bhanu
--

ALTER TABLE ONLY public."VitalsReading"
    ADD CONSTRAINT "VitalsReading_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES public."Patient"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO bhanu;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO bhanu;


--
-- PostgreSQL database dump complete
--

\unrestrict x7UtfaiqanE47ZJFZVm31JHEPOd6acZwJJXAsgguxx39buawVzRPSfFtyRupprF

