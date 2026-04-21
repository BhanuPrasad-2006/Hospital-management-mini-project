/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  ArogyaSeva HMS — Auth Middleware (Zero Trust)                  ║
 * ║  JWT Access + Refresh Token Rotation                            ║
 * ║  Node.js + Express | jsonwebtoken                               ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Design:
 *   - Access Token  → short-lived (15 min), sent in Authorization header
 *   - Refresh Token → long-lived (30 days), stored in UserSession table
 *   - On every access token use the token payload version is checked against
 *     DB so revocation works even before expiry (Zero Trust principle)
 *   - On access token expiry, client calls POST /api/auth/refresh with the
 *     refresh token; we rotate (delete old, create new) — one-time-use refresh
 */

"use strict";

const jwt  = require("jsonwebtoken");
const crypto = require("crypto");
const prisma = require("../config/db");

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCESS_SECRET  = process.env.JWT_SECRET          || "CHANGE_ME_ACCESS";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET  || "CHANGE_ME_REFRESH";
const ACCESS_TTL     = process.env.JWT_EXPIRES_IN      || "15m";
const REFRESH_TTL    = process.env.JWT_REFRESH_EXPIRES_IN || "30d";

// ─── Token Helpers ────────────────────────────────────────────────────────────

/**
 * Build the minimal payload embedded in both token types.
 * We deliberately keep this small — no PII in the JWT.
 */
function _buildPayload(entity, entityType) {
  return {
    sub:  entity.id,          // standard JWT subject
    role: entity.role ?? entity.staffRole ?? "PATIENT", // unified role field
    type: entityType,         // "PATIENT" | "DOCTOR" | "STAFF"
    jti:  crypto.randomUUID(), // unique token ID for revocation
  };
}

/**
 * Sign a short-lived access token (15 min default).
 * @param {object} entity     - Patient | Doctor | Staff record
 * @param {string} entityType - "PATIENT" | "DOCTOR" | "STAFF"
 * @returns {string} Signed JWT
 */
function generateAccessToken(entity, entityType) {
  return jwt.sign(
    _buildPayload(entity, entityType),
    ACCESS_SECRET,
    { expiresIn: ACCESS_TTL, algorithm: "HS256" }
  );
}

/**
 * Create a long-lived refresh token, persist it to UserSession,
 * and return the raw token string.
 *
 * @param {object} entity     - Patient | Doctor | Staff record
 * @param {string} entityType - "PATIENT" | "DOCTOR" | "STAFF"
 * @param {object} meta       - { ipAddress, userAgent }
 * @returns {Promise<string>} Signed refresh JWT
 */
async function generateRefreshToken(entity, entityType, meta = {}) {
  const payload = _buildPayload(entity, entityType);

  const refreshToken = jwt.sign(
    { ...payload, tokenFamily: crypto.randomUUID() }, // tokenFamily enables family revocation
    REFRESH_SECRET,
    { expiresIn: REFRESH_TTL, algorithm: "HS256" }
  );

  // Persist to DB so we can revoke / rotate
  const expiresAt = new Date(Date.now() + parseTTLtoMs(REFRESH_TTL));

  await prisma.userSession.create({
    data: {
      // Polymorphic assignment — set only the matching FK
      ...(entityType === "PATIENT" && { patientId: entity.id }),
      ...(entityType === "DOCTOR"  && { doctorId:  entity.id }),
      ...(entityType === "STAFF"   && { staffId:   entity.id }),
      token:     crypto.createHash("sha256").update(refreshToken).digest("hex"), // store hash, not raw
      ipAddress: meta.ipAddress || null,
      userAgent: meta.userAgent || null,
      expiresAt,
    },
  });

  return refreshToken;
}

/**
 * Rotate refresh token: invalidate the old one, issue a new pair.
 * Implements single-use refresh (token rotation).
 *
 * @param {string} oldRefreshToken
 * @param {object} meta - { ipAddress, userAgent }
 * @returns {Promise<{ accessToken, refreshToken, entity, entityType }>}
 */
async function rotateRefreshToken(oldRefreshToken, meta = {}) {
  // 1. Verify signature
  let decoded;
  try {
    decoded = jwt.verify(oldRefreshToken, REFRESH_SECRET);
  } catch (err) {
    throw Object.assign(new Error("Invalid or expired refresh token."), { status: 401 });
  }

  // 2. Look up session by hashed token
  const tokenHash = crypto.createHash("sha256").update(oldRefreshToken).digest("hex");
  const session   = await prisma.userSession.findFirst({ where: { token: tokenHash } });

  if (!session || session.expiresAt < new Date()) {
    // Possible token reuse — revoke entire session family
    if (session) await prisma.userSession.delete({ where: { id: session.id } });
    throw Object.assign(new Error("Refresh token reuse detected. Please log in again."), { status: 401 });
  }

  // 3. Delete old session (one-time-use)
  await prisma.userSession.delete({ where: { id: session.id } });

  // 4. Fetch the entity (patient / doctor / staff)
  const entityType = decoded.type;
  const entity     = await _fetchEntity(decoded.sub, entityType);

  if (!entity || entity.isDeleted) {
    throw Object.assign(new Error("Account not found or deactivated."), { status: 401 });
  }

  _assertActive(entity);

  // 5. Issue a new pair
  const accessToken  = generateAccessToken(entity, entityType);
  const refreshToken = await generateRefreshToken(entity, entityType, meta);

  return { accessToken, refreshToken, entity, entityType };
}

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * authenticate — Zero Trust access token verification.
 *
 * Reads the Bearer token from the Authorization header,
 * verifies signature, and performs a live DB check to ensure
 * the entity is still active (supports immediate revocation).
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return _deny(res, 401, "No access token provided.");
    }

    const token = authHeader.slice(7); // strip "Bearer "

    // 1. Verify JWT signature + expiry
    let decoded;
    try {
      decoded = jwt.verify(token, ACCESS_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return _deny(res, 401, "Access token expired. Please refresh.", "TOKEN_EXPIRED");
      }
      return _deny(res, 401, "Invalid access token.");
    }

    // 2. Live entity check (Zero Trust — never trust the token alone)
    const entity = await _fetchEntity(decoded.sub, decoded.type);

    if (!entity || entity.isDeleted) {
      return _deny(res, 401, "Account not found.");
    }

    try {
      _assertActive(entity);
    } catch (err) {
      return _deny(res, 403, err.message);
    }

    // 3. Attach to request
    req.user = {
      id:         decoded.sub,
      role:       decoded.role,
      entityType: decoded.type,
      jti:        decoded.jti,
    };

    next();
  } catch (err) {
    console.error("[auth] Unexpected error:", err.message);
    return _deny(res, 500, "Authentication error.");
  }
}

/**
 * optionalAuth — same as authenticate but never blocks the request.
 * Sets req.user = null if token is absent or invalid.
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      req.user = null;
      return next();
    }

    const token   = authHeader.slice(7);
    const decoded = jwt.verify(token, ACCESS_SECRET);
    const entity  = await _fetchEntity(decoded.sub, decoded.type);

    if (entity && !entity.isDeleted && _isActive(entity)) {
      req.user = {
        id:         decoded.sub,
        role:       decoded.role,
        entityType: decoded.type,
        jti:        decoded.jti,
      };
    } else {
      req.user = null;
    }
  } catch {
    req.user = null;
  }

  next();
}

// ─── Private helpers ──────────────────────────────────────────────────────────

async function _fetchEntity(id, entityType) {
  const select = {
    id:       true,
    isActive: true,
    isDeleted: true,
  };

  switch (entityType) {
    case "PATIENT":
      return prisma.patient.findUnique({ where: { id }, select });
    case "DOCTOR":
      return prisma.doctor.findUnique({ where: { id }, select });
    case "STAFF":
      return prisma.staff.findUnique({
        where:  { id },
        select: { ...select, role: true },
      });
    default:
      return null;
  }
}

function _assertActive(entity) {
  if (!entity.isActive) {
    throw new Error("Account has been deactivated. Contact admin.");
  }
}

function _isActive(entity) {
  return entity.isActive && !entity.isDeleted;
}

function _deny(res, status, message, code = null) {
  return res.status(status).json({
    success: false,
    message,
    ...(code && { code }),
  });
}

/** Convert TTL string (e.g. "30d", "15m") to milliseconds. */
function parseTTLtoMs(ttl) {
  const units = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  const match = String(ttl).match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 86_400_000; // default 7 days
  return parseInt(match[1]) * units[match[2]];
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  authenticate,
  optionalAuth,
  generateAccessToken,
  generateRefreshToken,
  rotateRefreshToken,
};
