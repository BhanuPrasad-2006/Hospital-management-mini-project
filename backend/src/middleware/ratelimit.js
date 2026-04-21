/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  ArogyaSeva HMS — Rate Limiters (PRD §8.4)                      ║
 * ║  3 limiters: login (brute-force), api (per-user), upload        ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

"use strict";

const rateLimit = require("express-rate-limit");
const { getRedisClient, KEYS } = require("../config/redis");
const { writeAuditLog }        = require("../security/audit");

// ─── Shared response helper ────────────────────────────────────────────────────

function _tooMany(req, res, windowMin, extra = {}) {
  return res.status(429).json({
    success: false,
    error:   `Too many requests. Try again in ${windowMin} minutes.`,
    code:    "RATE_LIMIT_EXCEEDED",
    ...extra,
  });
}

// ─── 1. loginLimiter ─────────────────────────────────────────────────────────
// 5 attempts per 15 minutes per IP.
// On violation: audit log + auto-block IP in Redis Set 'blocked-ips'.

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      5,
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator:    (req) => req.ip,
  skipSuccessfulRequests: true,  // only failed attempts count

  handler: async (req, res) => {
    const ip = req.ip;

    try {
      // Auto-block IP in Redis Set
      const redis = await getRedisClient();
      await redis.sAdd("blocked-ips", ip);

      // Audit log the brute-force attempt
      await writeAuditLog({
        entityType: null,
        entityId:   null,
        action:     "BRUTE_FORCE_ATTEMPT",
        resource:   "Auth",
        ipAddress:  ip,
        userAgent:  req.headers["user-agent"],
        details:    { path: req.originalUrl, autoBlocked: true },
      });

      console.warn(`[security] IP auto-blocked after brute-force: ${ip}`);
    } catch (err) {
      console.error("[loginLimiter] Redis block failed:", err.message);
    }

    return res.status(429).json({
      success: false,
      error:   "Too many login attempts. Try again in 15 minutes.",
      code:    "BRUTE_FORCE_BLOCKED",
    });
  },
});

// ─── 2. apiLimiter ───────────────────────────────────────────────────────────
// 200 requests per 15 minutes per AUTHENTICATED USER (userId from JWT).
// Falls back to IP if req.user is not set (unauthenticated routes).

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      200,
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator:    (req) => req.user?.id || req.ip,  // per-user, not per-IP
  handler:         (req, res) => _tooMany(req, res, 15),
});

// ─── 3. uploadLimiter ────────────────────────────────────────────────────────
// 10 requests per hour per authenticated user for file upload endpoints.

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1 hour
  max:      10,
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator:    (req) => req.user?.id || req.ip,
  handler:         (req, res) => _tooMany(req, res, 60, {
    error: "Upload limit reached. You can upload 10 files per hour.",
  }),
});

// ─── 4. generalLimiter (kept for backward-compat import in server.js) ────────

const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max:      parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator:    (req) => req.ip,
  handler:         (req, res) => _tooMany(req, res, 15),
});

// ─── 5. sensitiveLimiter (admin / QR / critical ops) ─────────────────────────

const sensitiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max:      5,
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator:    (req) => req.user?.id || req.ip,
  handler:         (req, res) => _tooMany(req, res, 60, {
    error: "Too many sensitive requests. Try again in 1 hour.",
  }),
});

module.exports = {
  loginLimiter,
  apiLimiter,
  uploadLimiter,
  generalLimiter,
  sensitiveLimiter,
};
