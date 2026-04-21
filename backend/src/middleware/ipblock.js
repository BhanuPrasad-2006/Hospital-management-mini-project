/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  ArogyaSeva HMS — IP Blocking Middleware (PRD §8.4)             ║
 * ║  Redis Set 'blocked-ips' checked on every request               ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Usage in server.js (apply after helmet/cors, before routes):
 *   app.use(checkBlocked);
 *
 * Admin endpoints (mount separately under authenticate + authorize("ADMIN")):
 *   POST   /api/admin/security/block-ip    { ip }
 *   DELETE /api/admin/security/unblock-ip  { ip }
 *   GET    /api/admin/security/blocked-ips
 */

"use strict";

const { getRedisClient } = require("../config/redis");
const { writeAuditLog }  = require("../security/audit");

const REDIS_SET = "blocked-ips";

// ─── checkBlocked ─────────────────────────────────────────────────────────────

/**
 * Express middleware — checks req.ip against Redis Set 'blocked-ips'.
 * Returns 403 immediately if blocked. Never crashes the request pipeline.
 */
async function checkBlocked(req, res, next) {
  // Skip for the health-check endpoint (monitoring tools)
  if (req.path === "/api/health") return next();

  const ip = req.ip;
  if (!ip) return next();

  try {
    const redis     = await getRedisClient();
    const isBlocked = await redis.sIsMember(REDIS_SET, ip);

    if (isBlocked) {
      // Log the blocked attempt (fire-and-forget — never await in hot path)
      writeAuditLog({
        entityType: null,
        entityId:   null,
        action:     "BLOCKED_IP_ATTEMPT",
        resource:   req.originalUrl,
        ipAddress:  ip,
        userAgent:  req.headers["user-agent"],
        details:    { method: req.method, path: req.originalUrl },
      }).catch(() => {});

      return res.status(403).json({
        success: false,
        error:   "Access denied. Your IP has been blocked due to suspicious activity.",
        code:    "IP_BLOCKED",
      });
    }
  } catch (err) {
    // Redis failure must never block legitimate traffic
    console.error("[ipBlock] Redis check failed — allowing request:", err.message);
  }

  next();
}

// ─── Admin: block IP ──────────────────────────────────────────────────────────

async function blockIp(req, res) {
  const { ip, reason } = req.body;

  if (!ip) {
    return res.status(422).json({ success: false, error: "ip is required." });
  }

  // Basic IP format validation (IPv4 or IPv6)
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6  = /^[0-9a-fA-F:]+$/;
  if (!ipv4.test(ip) && !ipv6.test(ip)) {
    return res.status(422).json({ success: false, error: "Invalid IP address format." });
  }

  try {
    const redis = await getRedisClient();
    await redis.sAdd(REDIS_SET, ip);

    await writeAuditLog({
      entityType: "STAFF",
      entityId:   req.user.id,
      action:     "BRUTE_FORCE_ATTEMPT",  // reuse existing AuditAction enum
      resource:   "IPBlock",
      ipAddress:  req.ip,
      details:    { blockedIp: ip, reason: reason || "Manual block by admin" },
    });

    return res.json({ success: true, message: `IP ${ip} blocked successfully.` });
  } catch (err) {
    console.error("[ipBlock] blockIp error:", err);
    return res.status(500).json({ success: false, error: "Failed to block IP." });
  }
}

// ─── Admin: unblock IP ────────────────────────────────────────────────────────

async function unblockIp(req, res) {
  const { ip } = req.body;
  if (!ip) {
    return res.status(422).json({ success: false, error: "ip is required." });
  }

  try {
    const redis  = await getRedisClient();
    const removed = await redis.sRem(REDIS_SET, ip);

    await writeAuditLog({
      entityType: "STAFF",
      entityId:   req.user.id,
      action:     "UPDATE",
      resource:   "IPBlock",
      ipAddress:  req.ip,
      details:    { unblockedIp: ip, wasPresent: removed > 0 },
    });

    return res.json({
      success: true,
      message: removed > 0 ? `IP ${ip} unblocked.` : `IP ${ip} was not in the blocked list.`,
    });
  } catch (err) {
    console.error("[ipBlock] unblockIp error:", err);
    return res.status(500).json({ success: false, error: "Failed to unblock IP." });
  }
}

// ─── Admin: list blocked IPs ──────────────────────────────────────────────────

async function listBlockedIps(req, res) {
  try {
    const redis   = await getRedisClient();
    const blocked = await redis.sMembers(REDIS_SET);

    return res.json({ success: true, data: { count: blocked.length, ips: blocked.sort() } });
  } catch (err) {
    console.error("[ipBlock] listBlockedIps error:", err);
    return res.status(500).json({ success: false, error: "Failed to fetch blocked IPs." });
  }
}

module.exports = { checkBlocked, blockIp, unblockIp, listBlockedIps };
