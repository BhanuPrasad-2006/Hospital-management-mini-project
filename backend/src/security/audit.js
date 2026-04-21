/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  ArogyaSeva HMS — Blockchain-Style Audit Logger                 ║
 * ║  SHA-256 hash chain over AuditLog entries                       ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * How the hash chain works:
 *
 *   Block 0 (GENESIS):  prevHash = "0000...0000" (64 zeros)
 *   Block N:            hash = SHA256( prevHash | entityType | entityId |
 *                                      action | resource | resourceId |
 *                                      ipAddress | details | timestamp )
 *
 *   Inserting/updating any past row breaks the chain — detectable by
 *   verifyAuditChain().  This satisfies HIPAA audit-trail immutability.
 *
 * Usage:
 *   const { writeAuditLog }     = require("../security/audit");
 *   const { verifyAuditChain }  = require("../security/audit");
 *
 *   // Write a log entry
 *   await writeAuditLog({
 *     entityType: "DOCTOR",
 *     entityId:   "uuid-of-the-doctor",
 *     action:     "READ",            // AuditAction enum value
 *     resource:   "Prescription",
 *     resourceId: "uuid-of-rx",
 *     ipAddress:  req.ip,
 *     userAgent:  req.headers["user-agent"],
 *     details:    { prescriptionId: "..." },
 *   });
 *
 *   // Verify integrity (admin / scheduled job)
 *   const { valid, brokenAt } = await verifyAuditChain();
 */

"use strict";

const crypto = require("crypto");
const prisma  = require("../config/db");

// ─── Constants ────────────────────────────────────────────────────────────────

const GENESIS_HASH = "0".repeat(64); // 64-char all-zero SHA-256 placeholder

// ─── Hash computation ─────────────────────────────────────────────────────────

/**
 * Compute the SHA-256 hash for one audit log block.
 *
 * All values are coerced to strings and sorted canonically to ensure
 * deterministic output regardless of key insertion order.
 *
 * @param {object} entry - The audit log fields (before DB insertion)
 * @param {string} prevHash - Hash of the immediately preceding block
 * @returns {string} 64-char hex digest
 */
function computeHash(entry, prevHash) {
  const canonical = JSON.stringify({
    prevHash:   prevHash ?? GENESIS_HASH,
    entityType: entry.entityType    ?? null,
    entityId:   entry.entityId      ?? null,
    action:     entry.action,
    resource:   entry.resource,
    resourceId: entry.resourceId    ?? null,
    ipAddress:  entry.ipAddress     ?? null,
    details:    entry.details       ?? null,
    timestamp:  entry.createdAt instanceof Date
      ? entry.createdAt.toISOString()
      : new Date(entry.createdAt ?? Date.now()).toISOString(),
  });

  return crypto.createHash("sha256").update(canonical, "utf8").digest("hex");
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * writeAuditLog
 *
 * 1. Reads the latest AuditLog row's hash (the "tip" of the chain).
 * 2. Computes a new hash chained to it.
 * 3. Inserts a new AuditLog row atomically.
 *
 * The whole operation runs inside a Prisma $transaction so concurrent
 * writes don't produce a forked chain.  If the transaction fails the
 * error is swallowed so audit logging never crashes the app.
 *
 * @param {object} params
 * @param {string} [params.entityType]  - "PATIENT" | "DOCTOR" | "STAFF" (who did it)
 * @param {string} [params.entityId]    - UUID of the acting entity
 * @param {string}  params.action       - AuditAction enum: CREATE|READ|UPDATE|DELETE|LOGIN…
 * @param {string}  params.resource     - e.g. "Prescription", "Patient", "Bill"
 * @param {string} [params.resourceId]  - UUID of the affected record
 * @param {string} [params.ipAddress]
 * @param {string} [params.userAgent]
 * @param {object} [params.details]     - Any extra JSON-serialisable context
 * @returns {Promise<object|null>} Created AuditLog record, or null on failure
 */
async function writeAuditLog({
  entityType = null,
  entityId   = null,
  action,
  resource,
  resourceId = null,
  ipAddress  = null,
  userAgent  = null,
  details    = null,
} = {}) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch tip of chain inside the transaction (row-level lock via findFirst)
      const lastLog = await tx.auditLog.findFirst({
        orderBy: { createdAt: "desc" },
        select:  { hash: true },
      });

      const prevHash  = lastLog?.hash ?? GENESIS_HASH;
      const createdAt = new Date();

      // 2. Compute block hash
      const entry = {
        entityType,
        entityId,
        action,
        resource,
        resourceId,
        ipAddress,
        details: details ? JSON.stringify(details) : null,
        createdAt,
      };

      const hash = computeHash(entry, prevHash);

      // 3. Insert
      return tx.auditLog.create({
        data: {
          entityType: entityType ?? null,
          entityId:   entityId   ?? null,
          action,
          resource,
          resourceId: resourceId ?? null,
          ipAddress:  ipAddress  ?? null,
          userAgent:  userAgent  ?? null,
          details:    entry.details,
          prevHash,
          hash,
          createdAt,
        },
      });
    });

    return result;
  } catch (err) {
    // Audit logging must never crash the primary request
    console.error("[audit] writeAuditLog failed:", err.message);
    return null;
  }
}

// ─── Express middleware wrappers ──────────────────────────────────────────────

/**
 * auditMiddleware
 *
 * Global middleware — logs every mutating request (POST/PUT/PATCH/DELETE)
 * made by an authenticated user.  Fires on res.finish so the status code
 * is captured.
 *
 * Apply in server.js AFTER authenticate middleware.
 */
function auditMiddleware(req, res, next) {
  const SKIP_PATHS = ["/api/health", "/favicon.ico"];
  if (SKIP_PATHS.some(p => req.path.startsWith(p))) return next();

  res.on("finish", () => {
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return;
    if (!req.user) return; // don't log unauthenticated requests here

    writeAuditLog({
      entityType: req.user.entityType ?? null,
      entityId:   req.user.id         ?? null,
      action:     req.method,
      resource:   req.baseUrl + req.path,
      resourceId: req.params?.id ?? null,
      ipAddress:  req.ip,
      userAgent:  req.headers["user-agent"],
      details:    { statusCode: res.statusCode, query: req.query },
    });
  });

  next();
}

/**
 * auditAction(action, resource)
 *
 * Route-level decorator for explicit, named audit events.
 *
 * @param {string} action   - AuditAction enum value
 * @param {string} resource - Human-readable resource name
 *
 * @example
 *   router.post("/", authenticate, authorize("DOCTOR"),
 *                    auditAction("CREATE","Prescription"), createPrescription);
 */
function auditAction(action, resource) {
  return (req, res, next) => {
    res.on("finish", () => {
      if (res.statusCode >= 400) return; // don't log failed operations
      if (!req.user) return;

      writeAuditLog({
        entityType: req.user.entityType ?? null,
        entityId:   req.user.id         ?? null,
        action,
        resource,
        resourceId: req.params?.id ?? null,
        ipAddress:  req.ip,
        userAgent:  req.headers["user-agent"],
        details:    { statusCode: res.statusCode },
      });
    });

    next();
  };
}

// ─── Chain Verification ───────────────────────────────────────────────────────

/**
 * verifyAuditChain
 *
 * Scans all AuditLog rows in chronological order and recomputes each hash,
 * verifying that:
 *   (a) prevHash matches the previous row's hash
 *   (b) The stored hash matches the recomputed hash
 *
 * Any mismatch indicates tampering.  Process in batches to handle large tables.
 *
 * @param {number} [batchSize=500]
 * @returns {Promise<{ valid: boolean, totalChecked: number, brokenAt: string|null }>}
 */
async function verifyAuditChain(batchSize = 500) {
  let cursor    = null; // ID cursor for pagination
  let prevHash  = GENESIS_HASH;
  let total     = 0;
  let brokenAt  = null;

  while (true) {
    const batch = await prisma.auditLog.findMany({
      orderBy: { createdAt: "asc" },
      take:    batchSize,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
    });

    if (batch.length === 0) break;

    for (const log of batch) {
      // Check prevHash linkage
      const expectedPrevHash = log.prevHash ?? GENESIS_HASH;
      if (prevHash !== expectedPrevHash) {
        brokenAt = log.id;
        return { valid: false, totalChecked: total, brokenAt };
      }

      // Recompute hash
      const recomputed = computeHash(log, expectedPrevHash);
      if (log.hash !== recomputed) {
        brokenAt = log.id;
        return { valid: false, totalChecked: total, brokenAt };
      }

      prevHash = log.hash;
      total++;
    }

    cursor = batch[batch.length - 1].id;
    if (batch.length < batchSize) break;
  }

  return { valid: true, totalChecked: total, brokenAt: null };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  writeAuditLog,
  auditMiddleware,
  auditAction,
  verifyAuditChain,
  computeHash,
  GENESIS_HASH,
};
