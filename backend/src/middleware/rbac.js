/**
 * Role-Based Access Control (RBAC) Middleware
 *
 * Restricts route access to specific user roles.
 * Must be used AFTER the authenticate middleware.
 *
 * Usage:
 *   router.get("/admin-only", authenticate, authorize("ADMIN"), handler);
 *   router.get("/clinical", authenticate, authorize("DOCTOR", "NURSE"), handler);
 */

/**
 * Returns middleware that only allows requests from users with the specified roles.
 * @param  {...string} allowedRoles - Role enum values, e.g. "ADMIN", "DOCTOR"
 * @returns {Function} Express middleware
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    // authenticate middleware must run first
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${allowedRoles.join(", ")}. Your role: ${req.user.role}.`,
      });
    }

    next();
  };
}

/**
 * Middleware that allows access only if the user is accessing their own resource,
 * OR if they have an admin/staff role.
 * @param {string} paramName - The req.params key that holds the target user ID
 * @param  {...string} exemptRoles - Roles that bypass the ownership check
 */
function authorizeOwnerOrRoles(paramName = "userId", ...exemptRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const targetId = req.params[paramName];
    const isOwner = req.user.id === targetId;
    const isExempt = exemptRoles.includes(req.user.role);

    if (!isOwner && !isExempt) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only access your own resources.",
      });
    }

    next();
  };
}

module.exports = { authorize, authorizeOwnerOrRoles };
