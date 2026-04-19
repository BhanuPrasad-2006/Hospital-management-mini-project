require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const path = require("path");
const fs = require("fs");

// ─── Security Middleware ──────────────────────────────────────────────────────
const { generalLimiter } = require("./middleware/ratelimit");
const { sanitize } = require("./middleware/sanitize");
const { auditMiddleware } = require("./middleware/audit");

// ─── Route Modules ────────────────────────────────────────────────────────────
const authRoutes = require("./modules/auth/auth.routes");
const patientRoutes = require("./modules/patients/patients.routes");
const doctorRoutes = require("./modules/doctors/doctors.routes");
const staffRoutes = require("./modules/staff/staff.routes");
const appointmentRoutes = require("./modules/appointments/appointments.routes");
const prescriptionRoutes = require("./modules/prescriptions/prescriptions.routes");
const pharmacyRoutes = require("./modules/pharmacy/pharmacy.routes");
const billingRoutes = require("./modules/billing/billing.routes");
const emergencyRoutes = require("./modules/emergency/emergency.routes");
const bloodRoutes = require("./modules/blood/blood.routes");
const aiRoutes = require("./modules/ai/ai.routes");

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Create uploads directory if it doesn't exist ─────────────────────────────
const uploadsDir = path.join(__dirname, "..", process.env.UPLOAD_DIR || "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ─── Global Security Middleware ───────────────────────────────────────────────

// Helmet: sets secure HTTP headers (XSS protection, HSTS, noSniff, etc.)
app.use(helmet());

// CORS: restrict origins
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Parse request bodies
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Input sanitization (XSS protection)
app.use(sanitize);

// Rate limiting (global)
app.use("/api/", generalLimiter);

// Audit logging (logs mutating requests by authenticated users)
app.use(auditMiddleware);

// ─── API Routes ───────────────────────────────────────────────────────────────

app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/prescriptions", prescriptionRoutes);
app.use("/api/pharmacy", pharmacyRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/emergency", emergencyRoutes);
app.use("/api/blood", bloodRoutes);
app.use("/api/ai", aiRoutes);

// ─── Health Check ─────────────────────────────────────────────────────────────

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Hospital Management API is running",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    security: {
      helmet: true,
      cors: true,
      rateLimiting: true,
      inputSanitization: true,
      auditLogging: true,
      encryption: !!process.env.ENCRYPTION_KEY,
    },
  });
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found.`,
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);

  // Don't leak error details in production
  const message =
    process.env.NODE_ENV === "production"
      ? "An internal server error occurred."
      : err.message;

  res.status(err.status || 500).json({
    success: false,
    message,
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  🏥  Hospital Management System — API Server            ║
║  🌐  http://localhost:${PORT}                              ║
║  🔒  Security: Helmet | CORS | Rate-Limit | Sanitize    ║
║  📋  Audit: Blockchain-style tamper-evident logging      ║
╚══════════════════════════════════════════════════════════╝
  `);
});
