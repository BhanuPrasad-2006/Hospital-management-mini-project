/**
 * Audit Logging Middleware
 *
 * Automatically logs every API request to the audit trail.
 * Pairs with the blockchain-style hasher in security/audit.js.
 *
 * Usage in server.js:
 *   app.use(auditMiddleware);
 *
 * Or on specific routes:
 *   router.post("/", authenticate, auditAction("CREATE", "Patient"), controller);
 */

const { writeAuditLog } = require("../security/audit");

/**
 * Global audit middleware — logs method, path, and user info for every request.
 * Best applied after the authenticate middleware so req.user is populated.
 */
function auditMiddleware(req, res, next) {
  // Skip health checks and static assets
  if (req.path === "/api/health" || req.path.startsWith("/static")) {
    return next();
  }

  // Log after the response is sent so we capture the status code
  res.on("finish", async () => {
    // Only audit mutating operations and authenticated requests
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && req.user) {
      await writeAuditLog({
        userId: req.user?.id || null,
        action: req.method,
        resource: req.baseUrl + req.path,
        resourceId: req.params?.id || null,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers["user-agent"],
        details: {
          statusCode: res.statusCode,
          query: req.query,
        },
      });
    }
  });

  next();
}

/**
 * Route-level audit decorator — logs a specific action.
 * @param {string} action  - e.g. "CREATE", "READ", "UPDATE", "DELETE"
 * @param {string} resource - e.g. "Patient", "Prescription"
 */
function auditAction(action, resource) {
  return (req, res, next) => {
    res.on("finish", async () => {
      if (res.statusCode < 400) {
        await writeAuditLog({
          userId: req.user?.id || null,
          action,
          resource,
          resourceId: req.params?.id || null,
          ipAddress: req.ip || req.connection?.remoteAddress,
          userAgent: req.headers["user-agent"],
          details: { statusCode: res.statusCode },
        });
      }
    });

    next();
  };
}

module.exports = { auditMiddleware, auditAction };
