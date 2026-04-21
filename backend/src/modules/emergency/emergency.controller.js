/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  ArogyaSeva HMS — Emergency + Ambulance Controller              ║
 * ║  PRD §5 Group 7 / §6.5                                          ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * POST /api/emergency/sos          — PUBLIC (no JWT) — SOS trigger
 * GET  /api/emergency/track/:id    — live ambulance GPS
 * PUT  /api/emergency/:id/resolve  — admin only
 * POST /api/ambulance/location     — driver GPS ping (AMBULANCE_DRIVER)
 * GET  /api/ambulance/fleet        — admin fleet view
 */

"use strict";

const prisma  = require("../../config/db");
const { writeAuditLog }             = require("../../security/audit");
const { haversineKm, sortByDistance } = require("../../utils/haversine");
const { encryptPII, decryptPII }    = require("../../security/encrypt");

const _ok  = (res, data, msg = "Success", s = 200) => res.status(s).json({ success: true, message: msg, data });
const _err = (res, s, msg) => res.status(s).json({ success: false, message: msg });

// ─── POST /api/emergency/sos ─────────────────────────────────────────────────
// PUBLIC — no JWT required. Works for anonymous callers.
//
// Logic inside a Prisma $transaction:
//   1. Create Emergency record (status = REQUESTED)
//   2. Fetch all AVAILABLE ambulances
//   3. Haversine: pick nearest
//   4. Update ambulance status → DISPATCHED
//   5. Link ambulance to emergency (status → DISPATCHED)
//   6. Emit Socket.io 'ambulance:dispatched'
async function triggerSOS(req, res) {
  const { latitude, longitude, symptoms = [], patientId, callerPhone } = req.body;

  if (latitude == null || longitude == null) {
    return _err(res, 422, "latitude and longitude are required.");
  }

  const lat = Number(latitude);
  const lng = Number(longitude);

  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return _err(res, 422, "Invalid GPS coordinates.");
  }

  try {
    const result = await prisma.$transaction(async (tx) => {

      // 1. Create emergency record
      const emergency = await tx.emergency.create({
        data: {
          patientId:   patientId  || null,
          callerPhone: callerPhone ? encryptPII(String(callerPhone)) : null,
          latitude:    lat,
          longitude:   lng,
          symptoms,
          status:      "REQUESTED",
        },
      });

      // 2. Fetch all AVAILABLE ambulances with GPS
      const available = await tx.ambulance.findMany({
        where: { status: "AVAILABLE", isActive: true },
        select: {
          id: true, vehicleNumber: true, driverName: true,
          currentLat: true, currentLng: true, equipmentType: true,
        },
      });

      if (!available.length) {
        // No ambulance available — still return the emergency record
        return { emergency, ambulance: null, distanceKm: null };
      }

      // 3. Haversine: pick nearest ambulance
      const ranked = sortByDistance(
        available.filter(a => a.currentLat != null && a.currentLng != null),
        { lat, lng },
        "currentLat", "currentLng"
      );

      // If none has GPS coordinates, pick first in list
      const nearest = ranked.length ? ranked[0] : available[0];

      // 4. Atomically update ambulance → DISPATCHED
      const updatedAmbulance = await tx.ambulance.update({
        where: { id: nearest.id },
        data:  { status: "DISPATCHED" },
      });

      // 5. Link ambulance to emergency → DISPATCHED
      const updatedEmergency = await tx.emergency.update({
        where: { id: emergency.id },
        data:  {
          ambulanceId: nearest.id,
          status:      "DISPATCHED",
          dispatchedAt: new Date(),
        },
      });

      return {
        emergency:   updatedEmergency,
        ambulance:   { ...nearest, status: "DISPATCHED" },
        distanceKm:  nearest._distanceKm ?? null,
      };
    }); // end $transaction

    // 6. Emit Socket.io event to the emergency room and admins
    const io = req.app.get("io");
    if (io) {
      const payload = {
        emergencyId:  result.emergency.id,
        ambulance:    result.ambulance,
        distanceKm:   result.distanceKm,
        etaMinutes:   result.distanceKm ? Math.ceil((result.distanceKm / 60) * 60) : null, // ~60 km/h
        timestamp:    new Date().toISOString(),
      };

      // Notify the patient's room
      io.to(`emergency-${result.emergency.id}`).emit("ambulance:dispatched", payload);
      // Notify all admin sessions
      io.to("admin-alerts").emit("emergency:new", {
        ...payload,
        latitude: lat,
        longitude: lng,
        symptoms,
      });
    }

    // Audit log (no userId — anonymous SOS allowed)
    await writeAuditLog({
      entityType: patientId ? "PATIENT" : null,
      entityId:   patientId || null,
      action:     "SOS_TRIGGER",
      resource:   "Emergency",
      resourceId: result.emergency.id,
      ipAddress:  req.ip,
      userAgent:  req.headers["user-agent"],
      details: {
        latitude: lat, longitude: lng,
        ambulanceAssigned: result.ambulance?.id || null,
        distanceKm: result.distanceKm,
      },
    });

    if (!result.ambulance) {
      return _ok(res, {
        emergency: result.emergency,
        ambulance: null,
        message:   "Emergency registered. No ambulances currently available. Help is being arranged.",
      }, "SOS received.", 201);
    }

    return _ok(res, result, "SOS received. Ambulance dispatched.", 201);
  } catch (err) {
    console.error("[emergency] triggerSOS:", err);
    return _err(res, 500, "Failed to process SOS. Please call emergency helpline directly.");
  }
}

// ─── GET /api/emergency/track/:emergencyId ────────────────────────────────────
// Returns latest GPS position from AmbulanceTracking
async function trackEmergency(req, res) {
  const { emergencyId } = req.params;

  try {
    const emergency = await prisma.emergency.findUnique({
      where:  { id: emergencyId },
      select: { id: true, ambulanceId: true, status: true, dispatchedAt: true, etaMinutes: true },
    });

    if (!emergency) return _err(res, 404, "Emergency not found.");
    if (!emergency.ambulanceId) {
      return _ok(res, { emergency, location: null, message: "No ambulance assigned yet." });
    }

    // Latest GPS ping from AmbulanceTracking
    const latest = await prisma.ambulanceTracking.findFirst({
      where:   { ambulanceId: emergency.ambulanceId, emergencyId },
      orderBy: { recordedAt: "desc" },
      select:  { latitude: true, longitude: true, speed: true, recordedAt: true },
    });

    // Also fetch ambulance details
    const ambulance = await prisma.ambulance.findUnique({
      where:  { id: emergency.ambulanceId },
      select: { vehicleNumber: true, driverName: true, driverPhone: true, status: true },
    });

    return _ok(res, { emergency, location: latest, ambulance });
  } catch (err) {
    console.error("[emergency] trackEmergency:", err);
    return _err(res, 500, "Failed to fetch tracking data.");
  }
}

// ─── PUT /api/emergency/:id/resolve ──────────────────────────────────────────
// Admin only: resolve emergency, free the ambulance
async function resolveEmergency(req, res) {
  const { id }    = req.params;
  const { notes } = req.body;

  try {
    const resolved = await prisma.$transaction(async (tx) => {
      const emergency = await tx.emergency.findUnique({
        where: { id },
        select: { id: true, ambulanceId: true, status: true },
      });

      if (!emergency) { const e = new Error("Emergency not found."); e.status = 404; throw e; }
      if (emergency.status === "COMPLETED") { const e = new Error("Already resolved."); e.status = 409; throw e; }

      // Free the ambulance
      if (emergency.ambulanceId) {
        await tx.ambulance.update({
          where: { id: emergency.ambulanceId },
          data:  { status: "AVAILABLE" },
        });
      }

      return tx.emergency.update({
        where: { id },
        data:  {
          status:      "COMPLETED",
          completedAt: new Date(),
          hospitalNotes: notes || null,
        },
      });
    });

    const io = req.app.get("io");
    if (io) {
      io.to(`emergency-${id}`).emit("emergency:resolved", {
        emergencyId: id,
        resolvedAt:  new Date().toISOString(),
      });
    }

    await writeAuditLog({
      entityType: "STAFF", entityId: req.user.id,
      action: "UPDATE", resource: "Emergency", resourceId: id,
      ipAddress: req.ip, details: { action: "RESOLVED" },
    });

    return _ok(res, resolved, "Emergency resolved.");
  } catch (err) {
    if (err.status) return _err(res, err.status, err.message);
    console.error("[emergency] resolveEmergency:", err);
    return _err(res, 500, "Failed to resolve emergency.");
  }
}

// ─── POST /api/ambulance/location ─────────────────────────────────────────────
// Ambulance driver pings GPS every 10s
// Inserts AmbulanceTracking row + emits to emergency room
async function updateLocation(req, res) {
  const { ambulanceId, emergencyId, latitude, longitude, speed } = req.body;

  if (!ambulanceId || latitude == null || longitude == null) {
    return _err(res, 422, "ambulanceId, latitude, and longitude are required.");
  }

  try {
    // Verify driver owns this ambulance (RLS)
    const ambulance = await prisma.ambulance.findFirst({
      where: { id: ambulanceId, driverStaffId: req.user.id },
      select: { id: true },
    });
    if (!ambulance) {
      return _err(res, 403, "You are not authorized to update this ambulance's location.");
    }

    const [tracking] = await prisma.$transaction([
      // Insert GPS ping into time-series table
      prisma.ambulanceTracking.create({
        data: {
          ambulanceId,
          emergencyId: emergencyId || null,
          latitude:    Number(latitude),
          longitude:   Number(longitude),
          speed:       speed != null ? Number(speed) : null,
        },
      }),
      // Update current position on ambulance record
      prisma.ambulance.update({
        where: { id: ambulanceId },
        data:  { currentLat: Number(latitude), currentLng: Number(longitude) },
      }),
    ]);

    // Emit to emergency room
    const io = req.app.get("io");
    if (io && emergencyId) {
      io.to(`emergency-${emergencyId}`).emit("ambulance:location", {
        ambulanceId,
        emergencyId,
        lat:       Number(latitude),
        lng:       Number(longitude),
        speed:     speed ?? null,
        timestamp: tracking.recordedAt.toISOString(),
      });
    }

    return _ok(res, tracking, "Location updated.");
  } catch (err) {
    console.error("[ambulance] updateLocation:", err);
    return _err(res, 500, "Failed to update location.");
  }
}

// ─── GET /api/ambulance/fleet ─────────────────────────────────────────────────
// Admin: all ambulances with last known position
async function getFleet(req, res) {
  try {
    const ambulances = await prisma.ambulance.findMany({
      orderBy: { status: "asc" },
      include: {
        tracking: {
          orderBy: { recordedAt: "desc" },
          take:    1,
          select:  { latitude: true, longitude: true, speed: true, recordedAt: true },
        },
        emergencies: {
          where:   { status: { notIn: ["COMPLETED", "CANCELLED"] } },
          select:  { id: true, status: true, requestedAt: true },
          take:    1,
          orderBy: { requestedAt: "desc" },
        },
      },
    });

    const summary = {
      total:       ambulances.length,
      available:   ambulances.filter(a => a.status === "AVAILABLE").length,
      dispatched:  ambulances.filter(a => a.status === "DISPATCHED").length,
      maintenance: ambulances.filter(a => a.status === "MAINTENANCE").length,
    };

    return _ok(res, { summary, ambulances });
  } catch (err) {
    console.error("[ambulance] getFleet:", err);
    return _err(res, 500, "Failed to fetch fleet.");
  }
}

module.exports = {
  triggerSOS, trackEmergency, resolveEmergency,
  updateLocation, getFleet,
};
