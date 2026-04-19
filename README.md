# 🏥 Hospital Management System

AI-powered Hospital Management System for rural India — prescription scanner, SOS ambulance dispatch, blood donor network, 8-language support, and zero-trust cybersecurity.

**Stack:** React + Vite | Node.js + Express | PostgreSQL + Prisma | Python + FastAPI (AI)

---

## 🔒 Cybersecurity Features

| Feature | Implementation | File |
|---------|---------------|------|
| **JWT Authentication** | Token-based auth with account lockout after 5 failed attempts | `middleware/auth.js` |
| **Role-Based Access Control** | 6 roles: Admin, Doctor, Nurse, Receptionist, Pharmacist, Patient | `middleware/rbac.js` |
| **Rate Limiting** | 3-tier: General (100/15min), Auth (10/15min), Sensitive (5/hr) | `middleware/ratelimit.js` |
| **AES-256-GCM Encryption** | Encrypts sensitive patient data (insurance IDs, SSNs) at rest | `security/encrypt.js` |
| **Blockchain Audit Logs** | SHA-256 chained, tamper-evident audit trail for every action | `security/audit.js` |
| **Input Sanitization** | Strips HTML, XSS payloads from all incoming data | `middleware/sanitize.js` |
| **Helmet** | Secure HTTP headers (HSTS, X-Frame-Options, CSP) | `server.js` |
| **Secure File Uploads** | MIME + extension validation, UUID rename, size limits | `middleware/upload.js` |
| **Password Hashing** | bcryptjs with 12 salt rounds | `modules/auth/auth.controller.js` |

---

## 📂 Project Structure

```
Hospital-management-mini-project/
├── frontend/                    ← React + Vite SPA
│   └── src/
│       ├── pages/               ← Route-level components
│       │   ├── patient/         ← Dashboard, Appointments, Medicines
│       │   ├── doctor/          ← Clinical dashboard, Prescriptions
│       │   ├── admin/           ← System control panel
│       │   ├── nurse/           ← Vitals, Tasks, Medication admin
│       │   └── billing/         ← Invoices, Payments, Reports
│       ├── components/          ← Shared UI components
│       ├── store/               ← State management
│       ├── services/            ← API service layer (Axios)
│       ├── hooks/               ← Custom React hooks
│       └── utils/               ← Formatters, validators, helpers
│
├── backend/                     ← Node.js + Express REST API
│   ├── prisma/
│   │   └── schema.prisma        ← AUTHORITATIVE database schema
│   └── src/
│       ├── server.js            ← Main Express server
│       ├── config/
│       │   ├── db.js            ← Prisma client singleton
│       │   └── redis.js         ← Redis client (optional)
│       ├── middleware/           ← auth.js, rbac.js, ratelimit.js, audit.js
│       ├── modules/             ← Feature modules (routes + controllers)
│       │   ├── auth/
│       │   ├── patients/
│       │   ├── doctors/
│       │   ├── staff/
│       │   ├── appointments/
│       │   ├── prescriptions/
│       │   ├── pharmacy/
│       │   ├── billing/
│       │   ├── emergency/
│       │   ├── blood/
│       │   └── ai/
│       └── security/
│           ├── encrypt.js       ← AES-256 encryption utilities
│           └── audit.js         ← Blockchain-style log hashing
│
├── ai-service/                  ← Python FastAPI AI microservice
│   ├── api/main.py              ← FastAPI server (port 8000)
│   ├── models/trained/          ← Saved scikit-learn .pkl models
│   ├── training/                ← Fine-tuning scripts
│   └── data/prepared/           ← JSONL training datasets
│
├── database/
│   ├── schema.sql               ← Raw SQL reference (pgAdmin use)
│   └── seed.sql                 ← Sample data (run after migration)
│
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Python 3.10+ (for AI service)

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env  # Edit with your DB credentials
npx prisma migrate dev --name init
npx prisma generate
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### AI Service Setup
```bash
cd ai-service
pip install -r requirements.txt
python api/main.py
```

---

## 🔑 Default Credentials (Development)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@hospital.com | Admin@123 |
| Doctor | dr.sharma@hospital.com | Doctor@123 |
| Patient | rajesh.kumar@email.com | Patient@123 |

> ⚠️ **Change all passwords and secrets before deploying to production!**

---

## 📜 License

MIT
