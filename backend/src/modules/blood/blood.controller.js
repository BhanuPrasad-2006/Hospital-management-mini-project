/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  ArogyaSeva HMS — Blood Bank Controller                         ║
 * ║  PRD §5 Group 7 — BloodInventory, BloodDonor, BloodRequest      ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * GET  /api/blood/inventory            — current units per blood group
 * POST /api/blood/request              — create blood request (critical → Socket.io)
 * POST /api/blood/donors               — register donor with GPS
 * GET  /api/blood/donors/nearby        — donors within 20km (Haversine)
 * PUT  /api/blood/inventory/:bloodGroup — update units (admin only)
 */

"use strict";

const prisma  = require("../../config/db");
const { writeAuditLog }             = require("../../security/audit");
const { filterWithinRadius }        = require("../../utils/haversine");
const { encryptPII, decryptPII }    = require("../../security/encrypt");

const _ok  = (res, data, msg = "Success", s = 200) => res.status(s).json({ success: true, message: msg, data });
const _err = (res, s, msg) => res.status(s).json({ success: false, message: msg });

const BLOOD_GROUPS = ["A_POS","A_NEG","B_POS","B_NEG","O_POS","O_NEG","AB_POS","AB_NEG"];
const DONOR_RADIUS_KM = 20;

// ─── GET /api/blood/inventory ─────────────────────────────────────────────────
async function getInventory(req, res) {
  try {
    const inventory = await prisma.bloodInventory.findMany({
      orderBy: { bloodGroup: "asc" },
    });

    // Compute critical groups (< 5 units)
    const critical = inventory
      .filter(i => i.unitsAvailable < 5)
      .map(i => i.bloodGroup);

    return _ok(res, { inventory, criticalGroups: critical });
  } catch (err) {
    console.error("[blood] getInventory:", err);
    return _err(res, 500, "Failed to fetch blood inventory.");
  }
}

// ─── POST /api/blood/request ──────────────────────────────────────────────────
// If urgency = EMERGENCY → emit Socket.io 'blood:urgent' to admin-alerts room
async function createBloodRequest(req, res) {
  const { patientId, bloodGroup, unitsNeeded, urgency = "ROUTINE", notes } = req.body;

  if (!bloodGroup || !unitsNeeded) {
    return _err(res, 422, "bloodGroup and unitsNeeded are required.");
  }
  if (!BLOOD_GROUPS.includes(bloodGroup)) {
    return _err(res, 422, `bloodGroup must be one of: ${BLOOD_GROUPS.join(", ")}`);
  }
  if (!["ROUTINE", "URGENT", "EMERGENCY"].includes(urgency)) {
    return _err(res, 422, "urgency must be ROUTINE, URGENT, or EMERGENCY.");
  }

  try {
    // Check available inventory
    const inventory = await prisma.bloodInventory.findFirst({
      where: { bloodGroup },
      select: { unitsAvailable: true },
    });

    const request = await prisma.bloodRequest.create({
      data: {
        patientId:   patientId || null,
        requestedBy: req.user.id,
        bloodGroup,
        unitsNeeded: Number(unitsNeeded),
        urgency,
        notes:       notes || null,
        status:      "PENDING",
      },
    });

    // Socket.io broadcast for critical requests
    if (urgency === "EMERGENCY") {
      const io = req.app.get("io");
      if (io) {
        io.to("admin-alerts").emit("blood:urgent", {
          requestId:        request.id,
          bloodGroup,
          unitsNeeded,
          patientId:        patientId || null,
          availableUnits:   inventory?.unitsAvailable ?? 0,
          requestedBy:      req.user.id,
          timestamp:        new Date().toISOString(),
        });
      }
    }

    await writeAuditLog({
      entityType: req.user.entityType || "STAFF",
      entityId:   req.user.id,
      action:     "CREATE",
      resource:   "BloodRequest",
      resourceId: request.id,
      ipAddress:  req.ip,
      details:    { bloodGroup, unitsNeeded, urgency, patientId },
    });

    return _ok(res, {
      request,
      inventoryAlert: inventory?.unitsAvailable < unitsNeeded
        ? `Warning: only ${inventory?.unitsAvailable ?? 0} units of ${bloodGroup} available.`
        : null,
    }, "Blood request created.", 201);
  } catch (err) {
    console.error("[blood] createBloodRequest:", err);
    return _err(res, 500, "Failed to create blood request.");
  }
}

// ─── POST /api/blood/donors ───────────────────────────────────────────────────
// Register a new blood donor with GPS coordinates
async function registerDonor(req, res) {
  const {
    name, bloodGroup, phone, email,
    latitude, longitude, address,
    age, healthConditions = [], patientId,
  } = req.body;

  if (!name || !bloodGroup || !phone || !age) {
    return _err(res, 422, "name, bloodGroup, phone, and age are required.");
  }
  if (!BLOOD_GROUPS.includes(bloodGroup)) {
    return _err(res, 422, `bloodGroup must be one of: ${BLOOD_GROUPS.join(", ")}`);
  }

  try {
    const donor = await prisma.bloodDonor.create({
      data: {
        patientId:   patientId || null,
        name,
        bloodGroup,
        phone:       encryptPII(String(phone)),         // AES-256 encrypted (schema: Bytes)
        email:       email ? encryptPII(String(email)) : null,
        latitude:    latitude  != null ? Number(latitude)  : null,
        longitude:   longitude != null ? Number(longitude) : null,
        address:     address   || null,
        age:         Number(age),
        healthConditions,
        isAvailable: true,
      },
    });

    await writeAuditLog({
      entityType: req.user?.entityType ?? null,
      entityId:   req.user?.id         ?? null,
      action:     "CREATE",
      resource:   "BloodDonor",
      resourceId: donor.id,
      ipAddress:  req.ip,
      details:    { bloodGroup, age },
    });

    // Return without encrypted bytes
    return _ok(res, {
      id: donor.id, name: donor.name, bloodGroup: donor.bloodGroup,
      latitude: donor.latitude, longitude: donor.longitude,
      age: donor.age, isAvailable: donor.isAvailable,
    }, "Donor registered.", 201);
  } catch (err) {
    if (err.code === "P2002") return _err(res, 409, "This patient is already registered as a donor.");
    console.error("[blood] registerDonor:", err);
    return _err(res, 500, "Failed to register donor.");
  }
}

// ─── GET /api/blood/donors/nearby ────────────────────────────────────────────
// Find available donors within DONOR_RADIUS_KM matching bloodGroup, ranked by distance
async function getNearbyDonors(req, res) {
  const { bloodGroup, latitude, longitude, radius } = req.query;

  if (!bloodGroup || latitude == null || longitude == null) {
    return _err(res, 422, "bloodGroup, latitude, and longitude are required query params.");
  }
  if (!BLOOD_GROUPS.includes(bloodGroup)) {
    return _err(res, 422, `bloodGroup must be one of: ${BLOOD_GROUPS.join(", ")}`);
  }

  const originLat  = Number(latitude);
  const originLng  = Number(longitude);
  const radiusKm   = Number(radius) || DONOR_RADIUS_KM;

  try {
    // Fetch available donors with GPS coordinates for this blood group
    const donors = await prisma.bloodDonor.findMany({
      where: {
        bloodGroup,
        isAvailable: true,
        isDeleted:   false,
        latitude:    { not: null },
        longitude:   { not: null },
      },
      select: {
        id: true, name: true, bloodGroup: true,
        latitude: true, longitude: true,
        address: true, age: true,
        lastDonationDate: true, totalDonations: true,
      },
    });

    // Haversine filter + sort
    const nearby = filterWithinRadius(
      donors,
      { lat: originLat, lng: originLng },
      radiusKm,
      "latitude", "longitude"
    );

    return _ok(res, {
      count:        nearby.length,
      radiusKm,
      donors:       nearby.map(d => ({
        ...d,
        distanceKm: parseFloat(d._distanceKm.toFixed(2)),
        _distanceKm: undefined, // clean up internal field
      })),
    });
  } catch (err) {
    console.error("[blood] getNearbyDonors:", err);
    return _err(res, 500, "Failed to find nearby donors.");
  }
}

// ─── PUT /api/blood/inventory/:bloodGroup ─────────────────────────────────────
// Admin: update blood unit count for a blood group
async function updateInventory(req, res) {
  const { bloodGroup } = req.params;
  const { unitsAvailable, expiryDate, rhFactor } = req.body;

  if (!BLOOD_GROUPS.includes(bloodGroup)) {
    return _err(res, 422, `Invalid blood group: ${bloodGroup}.`);
  }
  if (unitsAvailable == null || isNaN(Number(unitsAvailable)) || Number(unitsAvailable) < 0) {
    return _err(res, 422, "unitsAvailable must be a non-negative number.");
  }

  try {
    // Fetch old value for audit
    const old = await prisma.bloodInventory.findFirst({
      where: { bloodGroup },
      select: { unitsAvailable: true },
    });

    const updated = await prisma.bloodInventory.upsert({
      where: { bloodGroup_rhFactor: { bloodGroup, rhFactor: rhFactor || "POSITIVE" } },
      create: {
        bloodGroup,
        rhFactor:       rhFactor || "POSITIVE",
        unitsAvailable: Number(unitsAvailable),
        expiryDate:     expiryDate ? new Date(expiryDate) : null,
        lastUpdated:    new Date(),
      },
      update: {
        unitsAvailable: Number(unitsAvailable),
        expiryDate:     expiryDate ? new Date(expiryDate) : undefined,
        lastUpdated:    new Date(),
      },
    });

    await writeAuditLog({
      entityType: "STAFF",
      entityId:   req.user.id,
      action:     "UPDATE",
      resource:   "BloodInventory",
      resourceId: updated.id,
      ipAddress:  req.ip,
      details: {
        bloodGroup,
        oldUnits: old?.unitsAvailable ?? null,
        newUnits: Number(unitsAvailable),
      },
    });

    // Notify admins if stock now critical
    if (Number(unitsAvailable) < 5) {
      const io = req.app.get("io");
      if (io) {
        io.to("admin-alerts").emit("blood:low-stock", {
          bloodGroup,
          unitsAvailable: Number(unitsAvailable),
          timestamp: new Date().toISOString(),
        });
      }
    }

    return _ok(res, updated, `Blood inventory for ${bloodGroup} updated.`);
  } catch (err) {
    console.error("[blood] updateInventory:", err);
    return _err(res, 500, "Failed to update blood inventory.");
  }
}

module.exports = {
  getInventory, createBloodRequest, registerDonor,
  getNearbyDonors, updateInventory,
};
