AROGYASEVA HMS – Complete Database Setup Guide
🗄️ How the Database Works
```
Your HTML Page
     ↓  (calls)
frontend/js/api.js
     ↓  (HTTP request)
backend/src/server.js  (Node.js on port 5000)
     ↓  (Prisma ORM)
PostgreSQL Database  (port 5432)
     ↓  (returns data)
Back to your HTML page
```
---
📦 STEP 1 – Install PostgreSQL
Windows
Download: https://www.postgresql.org/download/windows/
Run installer → set password (remember it!)
Keep default port: 5432
Mac
```bash
brew install postgresql@16
brew services start postgresql@16
```
Linux/Ubuntu
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql
```
---
🗄️ STEP 2 – Create the Database
Open terminal and run:
```bash
# Login to PostgreSQL
psql -U postgres

# Inside psql, run these commands:
CREATE DATABASE arogyaseva_hms;
CREATE USER hms_user WITH PASSWORD 'YourStrongPassword';
GRANT ALL PRIVILEGES ON DATABASE arogyaseva_hms TO hms_user;
\c arogyaseva_hms
GRANT ALL ON SCHEMA public TO hms_user;
\q
```
---
⚙️ STEP 3 – Setup Backend
```bash
# Go to backend folder
cd backend

# Install all packages
npm install

# Copy .env and fill in your values
# Edit .env → change DATABASE_URL password to match Step 2
```
Your `.env` DATABASE_URL should be:
```
DATABASE_URL="postgresql://hms_user:YourStrongPassword@localhost:5432/arogyaseva_hms"
```
---
🔨 STEP 4 – Create All Tables
```bash
# This creates all 37 tables in PostgreSQL
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

# You should see: ✓ Applied migration, ✓ Generated Prisma Client
```
Verify tables were created:
```bash
# Open Prisma Studio (visual table viewer)
npx prisma studio
# Opens at http://localhost:5555
```
---
🌱 STEP 5 – Add Sample Data
```bash
# From the root folder (not backend folder)
node database/seed.js
```
This adds:
6 sample doctors with login codes
5 sample patients
8 staff members (admin, nurse, pharmacist etc)
8 medicines
3 ambulances
Blood inventory for all blood groups
---
🚀 STEP 6 – Start the Server
```bash
cd backend
npm run dev
```
You should see:
```
✅ PostgreSQL connected via Prisma
╔══════════════════════════════════════╗
║     AROGYASEVA HMS - API Server      ║
║  Status:  ✅ Running                 ║
║  Port:    5000                       ║
╚══════════════════════════════════════╝
```
---
🌐 STEP 7 – Open the Frontend
Open `frontend/index.html` in your browser.
Use VS Code Live Server extension or:
```bash
# Simple HTTP server
npx serve frontend
```
---
🔑 Test Login Credentials
Role	ID/Code	Password
Patient	PAT-2024-0001	Patient@123
Doctor	DOC-2024-CARD-001	Doctor@123
Admin	STF-ADM-001	Staff@123
Nurse	STF-NRS-001	Staff@123
Pharmacist	STF-PHR-001	Staff@123
---
📊 All 37 Database Tables
Patient Tables (3)
Table	What it stores
`Patient`	All patient personal info (encrypted)
`PatientSettings`	Language, notification preferences
`PatientHistory`	Past medical history from other hospitals
Doctor Tables (3)
Table	What it stores
`Doctor`	Doctor info, Doctor Code, specialization
`DoctorSettings`	Doctor preferences
`DoctorLeave`	Leave applications and approvals
Staff Tables (2)
Table	What it stores
`Staff`	Nurses, pharmacists, receptionists, accountants
`StaffSettings`	Staff preferences
Staff Roles Available:
ADMIN
RECEPTIONIST
NURSE
PHARMACIST
LAB_TECHNICIAN
ACCOUNTANT
SECURITY_OFFICER
HOUSEKEEPING
AMBULANCE_DRIVER
Hospital Infrastructure (3)
Table	What it stores
`Department`	Cardiology, ICU, OPD etc
`Room`	Room numbers per department
`Bed`	Individual beds, their status
Clinical Tables (7)
Table	What it stores
`Appointment`	Booked appointments
`Admission`	Inpatient admissions
`Prescription`	Written prescriptions
`PrescriptionMedicine`	Individual medicines in prescription
`DietPlan`	AI generated diet plan
`LabReport`	Blood tests, scans
`VitalsReading`	BP, HR, SpO2, Temperature
Pharmacy Tables (4)
Table	What it stores
`Medicine`	Medicine inventory
`DispenseLog`	Every dispensing logged
`MedicineOrder`	Patient online orders
`MedicineOrderItem`	Items in each order
Billing Tables (3)

Table	What it stores
`Bill`	Generated bills
`BillItem`	Itemized charges
`Payment`	Payment records
Emergency Tables (3)
Table	What it stores
`Emergency`	SOS triggers
`Ambulance`	Fleet management
`AmbulanceTracking`	Live GPS logs
Blood Bank Tables (3)
Table	What it stores
`BloodDonor`	Registered donors
`BloodInventory`	Units available per group
`BloodRequest`	Emergency requests
Staff Management (2)
Table	What it stores
`Shift`	Doctor and staff shift schedules
`Notification`	System notifications
Security Tables (4)
Table	What it stores
`AuditLog`	Every action logged (tamper-proof)
`UserSession`	Active login sessions
`BehaviorProfile`	Biometric patterns
`HospitalSettings`	Hospital config
---
🔐 Security Features in DB
AES-256 Encryption – name, phone, email stored as encrypted bytes
bcrypt – passwords hashed with salt rounds=12
Soft Delete – `isDeleted` flag, records never hard deleted
Audit Log – every action logged with SHA-256 hash chain
UUID Primary Keys – not sequential integers (harder to guess)
Indexes – on frequently searched fields for fast queries
---
📁 Why Two Database Files?
```
database/schema.sql  → Raw SQL backup reference
                        You can run this in pgAdmin if needed
                        Generated from Prisma schema

backend/prisma/schema.prisma → The REAL schema
                                Prisma reads this and creates tables
                                This is what you edit

ONE database → PostgreSQL (arogyaseva_hms)
```
---
🛠️ Useful Commands
```bash
# Reset DB and re-create all tables
npx prisma migrate reset

# View all tables visually
npx prisma studio

# Apply new migrations after schema change
npx prisma migrate dev --name your_change_name

# Re-generate Prisma client after schema change
npx prisma generate

# Direct DB query (in psql)
psql -U hms_user -d arogyaseva_hms -c "SELECT * FROM \"Patient\" LIMIT 5;"
```