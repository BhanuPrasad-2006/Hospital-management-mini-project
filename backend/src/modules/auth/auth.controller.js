/**
 * Auth Module — Controller
 * Handles registration, login, logout, and password management.
 */

const bcrypt = require("bcryptjs");
const prisma = require("../../config/db");
const { generateToken } = require("../../middleware/auth");
const { writeAuditLog } = require("../../security/audit");

const SALT_ROUNDS = 12;
const MAX_FAILED_LOGINS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

/**
 * POST /api/auth/register
 */
async function register(req, res) {
  try {
    const { email, password, role, firstName, lastName } = req.body;

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: role || "PATIENT",
      },
    });

    // Create role-specific profile
    if (role === "DOCTOR" || !role || role === "PATIENT") {
      // Create the associated profile based on role
      if (role === "PATIENT" || !role) {
        await prisma.patient.create({
          data: {
            userId: user.id,
            firstName: firstName || "",
            lastName: lastName || "",
            dateOfBirth: new Date("2000-01-01"),
            gender: "OTHER",
          },
        });
      }
    }

    // Audit log
    await writeAuditLog({
      userId: user.id,
      action: "REGISTER",
      resource: "User",
      resourceId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: "Registration successful.",
      data: {
        token,
        user: { id: user.id, email: user.email, role: user.role },
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ success: false, message: "Registration failed." });
  }
}

/**
 * POST /api/auth/login
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil - new Date()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account locked. Try again in ${minutesLeft} minutes.`,
      });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      // Increment failed login counter
      const failedLogins = user.failedLogins + 1;
      const updateData = { failedLogins };

      if (failedLogins >= MAX_FAILED_LOGINS) {
        updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      await writeAuditLog({
        userId: user.id,
        action: "LOGIN_FAILED",
        resource: "User",
        resourceId: user.id,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        details: { failedAttempts: failedLogins },
      });

      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Reset failed login counter and update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLogins: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: "LOGIN",
      resource: "User",
      resourceId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    const token = generateToken(user);

    res.json({
      success: true,
      message: "Login successful.",
      data: {
        token,
        user: { id: user.id, email: user.email, role: user.role },
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Login failed." });
  }
}

/**
 * POST /api/auth/logout
 */
async function logout(req, res) {
  try {
    await writeAuditLog({
      userId: req.user.id,
      action: "LOGOUT",
      resource: "User",
      resourceId: req.user.id,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: "Logged out successfully." });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ success: false, message: "Logout failed." });
  }
}

/**
 * GET /api/auth/me — returns the current user's profile
 */
async function getMe(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        patient: true,
        doctor: true,
        nurse: true,
        staff: true,
      },
    });

    res.json({ success: true, data: user });
  } catch (error) {
    console.error("GetMe error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch profile." });
  }
}

module.exports = { register, login, logout, getMe };
