/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ArogyaSeva HMS — Express Server (PRD §8.4 Security Layer)              ║
 * ║                                                                          ║
 * ║  Middleware stack order (top → bottom):                                  ║
 * ║    1. helmet          — secure HTTP headers (CSP, HSTS, X-Frame)         ║
 * ║    2. cors            — whitelist FRONTEND_URL only                       ║
 * ║    3. express.json    — body parsing (10mb limit)                         ║
 * ║    4. cookieParser    — cookie reading                                    ║
 * ║    5. xss-clean       — sanitize body/query/params                        ║
 * ║    6. hpp             — prevent HTTP Parameter Pollution                  ║
 * ║    7. checkBlocked    — Redis-based IP blocklist                          ║
 * ║    8. apiLimiter      — 200 req/15min per authenticated user              ║
 * ║    9. auditMiddleware — blockchain-style log for mutations                ║
 * ║   10. routes          — feature modules                                   ║
 * ║   11. 404 handler                                                         ║
 * ║   12. global error handler — no stack traces in production                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

"use strict";

require("dotenv").config();

const express      = require("express");
const cors         = require("cors");
const helmet       = require("helmet");
const hpp          = require("hpp");
const cookieParser = require("cookie-parser");
const xssClean     = require("xss-clean");
const http         = require("http");
const { attachSocketIO } = require("./config/socket");

// ─── Security Middleware ──────────────────────────────────────────────────────
const { checkBlocked }  = require("./middleware/ipblock");
const { apiLimiter, generalLimiter } = require("./middleware/ratelimit");
const { auditMiddleware } = require("./middleware/audit");
const { writeAuditLog }   = require("./security/audit");

// ─── IP Management (admin endpoints) ─────────────────────────────────────────
const { blockIp, unblockIp, listBlockedIps } = require("./middleware/ipblock");
const { authenticate }    = require("./middleware/auth");
const { authorize }       = require("./middleware/rbac");

// ─── Route Modules ────────────────────────────────────────────────────────────
const authRoutes         = require("./modules/auth/auth.routes");
const patientRoutes      = require("./modules/patients/patients.routes");
const doctorRoutes       = require("./modules/doctors/doctors.routes");
const nurseRoutes        = require("./modules/nurses/nurses.routes");
const adminRoutes        = require("./modules/admin/admin.routes");
const staffRoutes        = require("./modules/staff/staff.routes");
const appointmentRoutes  = require("./modules/appointments/appointments.routes");
const prescriptionRoutes = require("./modules/prescriptions/prescriptions.routes");
const pharmacyRoutes     = require("./modules/pharmacy/pharmacy.routes");
const billingRoutes      = require("./modules/billing/billing.routes");
const emergencyRoutes    = require("./modules/emergency/emergency.routes");
const bloodRoutes        = require("./modules/blood/blood.routes");
const ambulanceRoutes    = require("./modules/ambulance/ambulance.routes");
const aiRoutes           = require("./modules/ai/ai.routes");

// ─── App + HTTP Server ────────────────────────────────────────────────────────

const app    = express();
const server = http.createServer(app);
const PORT   = process.env.PORT || 5000;
const IS_PROD = process.env.NODE_ENV === "production";

// ─── Trust proxy ──────────────────────────────────────────────────────────────
app.set("trust proxy", 1);

// ═════════════════════════════════════════════════════════════════════════════
//  MIDDLEWARE STACK
// ═════════════════════════════════════════════════════════════════════════════

// ── 1. helmet — secure HTTP headers ──────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc:  ["'self'"],
        scriptSrc:   ["'self'", "cdnjs.cloudflare.com"],
        styleSrc:    ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com"],
        imgSrc:      ["'self'", "data:", "*.amazonaws.com"],
        connectSrc:  ["'self'"],
        fontSrc:     ["'self'", "cdnjs.cloudflare.com"],
        objectSrc:   ["'none'"],
        upgradeInsecureRequests: IS_PROD ? [] : null,
      },
    },
    hsts: {
      maxAge:            365 * 24 * 60 * 60, // 1 year in seconds
      includeSubDomains: true,
      preload:           true,
    },
    frameguard:      { action: "deny" },          // X-Frame-Options: DENY
    referrerPolicy:  { policy: "no-referrer" },   // Referrer-Policy
    noSniff:         true,                         // X-Content-Type-Options
    xssFilter:       true,                         // X-XSS-Protection (legacy)
    hidePoweredBy:   true,                         // remove X-Powered-By
  })
);

// ── 2. CORS — whitelist FRONTEND_URL only ────────────────────────────────────
const allowedOrigins = (process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map(o => o.trim());

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow curl/Postman in development (no origin header)
      if (!origin && !IS_PROD) return cb(null, true);
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: Origin "${origin}" is not allowed.`));
    },
    credentials:     true,
    methods:         ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders:  ["Content-Type", "Authorization", "X-Request-ID"],
    exposedHeaders:  ["X-RateLimit-Limit", "X-RateLimit-Remaining"],
  })
);

// ── 3. Body parsing ───────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// ── 4. xss-clean — sanitize req.body, req.query, req.params ─────────────────
app.use(xssClean());

// ── 5. hpp — prevent HTTP Parameter Pollution ─────────────────────────────────
// Whitelist params that legitimately appear multiple times (e.g. filter arrays)
app.use(
  hpp({
    whitelist: ["status", "bloodGroup", "symptoms", "allergies", "tags"],
  })
);

// ── 6. checkBlocked — Redis IP blocklist (every request) ─────────────────────
app.use(checkBlocked);

// ── 7. apiLimiter — 200 req/15min per authenticated user ─────────────────────
// Applied globally here; loginLimiter is applied per-route in auth.routes.js
app.use("/api/", apiLimiter);

// ── 8. Audit middleware — logs all mutations by authenticated users ─────────────
app.use(auditMiddleware);

// ═════════════════════════════════════════════════════════════════════════════
//  IP MANAGEMENT (Admin-only, mounted before feature routes)
// ═════════════════════════════════════════════════════════════════════════════

app.post(
  "/api/admin/security/block-ip",
  authenticate, authorize("ADMIN", "SECURITY_OFFICER"),
  blockIp
);
app.delete(
  "/api/admin/security/unblock-ip",
  authenticate, authorize("ADMIN", "SECURITY_OFFICER"),
  unblockIp
);
app.get(
  "/api/admin/security/blocked-ips",
  authenticate, authorize("ADMIN", "SECURITY_OFFICER"),
  listBlockedIps
);

// ═════════════════════════════════════════════════════════════════════════════
//  FEATURE ROUTES
// ═════════════════════════════════════════════════════════════════════════════

app.use("/api/auth",          authRoutes);
app.use("/api/patients",      patientRoutes);
app.use("/api/doctor",        doctorRoutes);       // PRD §6.3
app.use("/api/nurse",         nurseRoutes);        // PRD §6.4
app.use("/api/admin",         adminRoutes);        // PRD §6.5
app.use("/api/billing",       billingRoutes);      // PRD §6.6
app.use("/api/staff",         staffRoutes);
app.use("/api/appointments",  appointmentRoutes);
app.use("/api/prescriptions", prescriptionRoutes);
app.use("/api/pharmacy",      pharmacyRoutes);
app.use("/api/emergency",      emergencyRoutes);
app.use("/api/ambulance",      ambulanceRoutes);
app.use("/api/blood",          bloodRoutes);
app.use("/api/ai",             aiRoutes);

// ═════════════════════════════════════════════════════════════════════════════
//  HEALTH CHECK
// ═════════════════════════════════════════════════════════════════════════════

app.get("/api/health", (req, res) => {
  res.json({
    status:      "ok",
    service:     "ArogyaSeva HMS API",
    environment: process.env.NODE_ENV || "development",
    timestamp:   new Date().toISOString(),
    security: {
      helmet:          true,
      cors:            true,
      xssClean:        true,
      hpp:             true,
      ipBlocking:      true,
      rateLimiting:    true,
      auditLogging:    true,
      encryption:      !!process.env.ENCRYPTION_KEY,
      jwtRefreshToken: !!process.env.JWT_REFRESH_SECRET,
    },
  });
});

// ═════════════════════════════════════════════════════════════════════════════
//  404 HANDLER
// ═════════════════════════════════════════════════════════════════════════════

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error:   `Route ${req.method} ${req.originalUrl} not found.`,
    code:    "NOT_FOUND",
  });
});

// ═════════════════════════════════════════════════════════════════════════════
//  GLOBAL ERROR HANDLER (PRD §8.4)
//  - Never leaks stack traces in production
//  - Logs all 500s to AuditLog with riskScore=90
//  - Returns consistent { success, error, code }
// ═════════════════════════════════════════════════════════════════════════════

// eslint-disable-next-line no-unused-vars
app.use(async (err, req, res, next) => {
  const status  = err.status || err.statusCode || 500;
  const isError = status >= 500;

  // Log 500-level errors to the audit trail with elevated risk score
  if (isError) {
    console.error("[server] Unhandled error:", IS_PROD ? err.message : err);

    writeAuditLog({
      entityType: req.user?.entityType ?? null,
      entityId:   req.user?.id         ?? null,
      action:     "DELETE",   // closest AuditAction to "system error"
      resource:   req.originalUrl,
      ipAddress:  req.ip,
      userAgent:  req.headers["user-agent"],
      details: {
        riskScore:  90,
        errorCode:  err.code    || "INTERNAL_ERROR",
        errorName:  err.name    || "Error",
        // Only include stack in non-production logs
        ...(IS_PROD ? {} : { stack: err.stack }),
      },
    }).catch(() => {}); // never let audit failure cascade
  }

  // Determine user-facing message
  const message = IS_PROD && isError
    ? "An unexpected error occurred. Please try again or contact support."
    : err.message || "Unknown error.";

  // Map common error types to HTTP codes
  const code =
    err.code === "P2025"     ? "RECORD_NOT_FOUND"   :   // Prisma not found
    err.code === "P2002"     ? "DUPLICATE_ENTRY"    :   // Prisma unique constraint
    err.name === "JsonWebTokenError" ? "INVALID_TOKEN" :
    err.name === "TokenExpiredError" ? "TOKEN_EXPIRED" :
    err.code  || "INTERNAL_ERROR";

  return res.status(status).json({
    success: false,
    error:   message,
    code,
  });
});

// ═════════════════════════════════════════════════════════════════════════════
//  START SERVER
// ═════════════════════════════════════════════════════════════════════════════

server.listen(PORT, () => {
  // Attach Socket.io AFTER server starts
  attachSocketIO(server, app);
  /* eslint-disable no-console */
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  🏥  ArogyaSeva HMS — API Server                                ║
║  🌐  http://localhost:${PORT}                                      ║
║                                                                  ║
║  Security Layer (PRD §8.4):                                      ║
║    ✅  Helmet (CSP + HSTS + X-Frame-Options: DENY)               ║
║    ✅  CORS  → ${(allowedOrigins[0] || "http://localhost:5173").padEnd(38)}║
║    ✅  xss-clean → sanitize body/query/params                    ║
║    ✅  hpp → prevent HTTP Parameter Pollution                     ║
║    ✅  Redis IP blocklist (auto-block on brute-force)            ║
║    ✅  Rate limiter (login: 5/15min, api: 200/15min)             ║
║    ✅  Blockchain-style audit log (SHA-256 chain)                ║
║    ✅  AES-256-CBC encryption for PII fields                     ║
║    ✅  JWT access + refresh token rotation                       ║
╚══════════════════════════════════════════════════════════════════╝
  `);
});

// Export for Socket.io attachment in a separate ws.js file
module.exports = { app, server };
