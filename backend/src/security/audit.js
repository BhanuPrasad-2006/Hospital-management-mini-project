/**
 * Blockchain-style Audit Log Hashing
 *
 * Every audit log entry is hashed with SHA-256, chaining the previous hash
 * so that tampering with any entry breaks the chain — providing tamper-evident
 * audit trails for compliance (HIPAA, etc.).
 */

const crypto = require("crypto");
const prisma = require("../config/db");

/**
 * Compute SHA-256 hash for an audit entry.
 * @param {object} entry
 * @param {string|null} prevHash
 * @returns {string} Hex-encoded SHA-256 hash
 */
function computeHash(entry, prevHash) {
  const data = JSON.stringify({
    prevHash: prevHash || "GENESIS",
    userId: entry.userId,
    action: entry.action,
    resource: entry.resource,
    resourceId: entry.resourceId,
    ipAddress: entry.ipAddress,
    details: entry.details,
    timestamp: entry.createdAt?.toISOString?.() || new Date().toISOString(),
  });

  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Write a tamper-evident audit log entry to the database.
 * @param {object} params
 * @param {string} params.userId    - ID of the user who performed the action
 * @param {string} params.action    - e.g. "CREATE", "READ", "UPDATE", "DELETE", "LOGIN"
 * @param {string} params.resource  - e.g. "Patient", "Prescription"
 * @param {string} [params.resourceId]
 * @param {string} [params.ipAddress]
 * @param {string} [params.userAgent]
 * @param {object} [params.details] - Any extra context (will be JSON-stringified)
 * @returns {Promise<object>} The created AuditLog record
 */
async function writeAuditLog({
  userId,
  action,
  resource,
  resourceId = null,
  ipAddress = null,
  userAgent = null,
  details = null,
}) {
  try {
    // Get the most recent log to chain hashes
    const lastLog = await prisma.auditLog.findFirst({
      orderBy: { createdAt: "desc" },
      select: { hash: true },
    });

    const prevHash = lastLog?.hash || null;

    const entry = {
      userId,
      action,
      resource,
      resourceId,
      ipAddress,
      userAgent,
      details: details ? JSON.stringify(details) : null,
      createdAt: new Date(),
    };

    const hash = computeHash(entry, prevHash);

    const auditLog = await prisma.auditLog.create({
      data: {
        ...entry,
        prevHash,
        hash,
      },
    });

    return auditLog;
  } catch (error) {
    // Audit logging should never crash the app — log and move on
    console.error("⚠️  Audit log write failed:", error.message);
    return null;
  }
}

/**
 * Verify the integrity of the entire audit chain.
 * @returns {Promise<{ valid: boolean, brokenAt: string|null }>}
 */
async function verifyAuditChain() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "asc" },
  });

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    const expectedPrevHash = i === 0 ? null : logs[i - 1].hash;

    if (log.prevHash !== expectedPrevHash) {
      return { valid: false, brokenAt: log.id };
    }

    const recomputedHash = computeHash(log, log.prevHash);
    if (log.hash !== recomputedHash) {
      return { valid: false, brokenAt: log.id };
    }
  }

  return { valid: true, brokenAt: null };
}

module.exports = { writeAuditLog, verifyAuditChain, computeHash };
