/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  ArogyaSeva HMS — Haversine Distance Utility                    ║
 * ║  Calculates great-circle distance between two GPS coordinates   ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Usage:
 *   const { haversineKm, sortByDistance, filterWithinRadius } = require("../utils/haversine");
 *
 *   const km = haversineKm(12.9716, 77.5946, 12.9352, 77.6245);   // ~4.5 km
 *
 *   const nearest = sortByDistance(
 *     ambulances,                // array of objects
 *     { lat: 12.97, lng: 77.59 }, // origin point
 *     "currentLat", "currentLng" // field names on each object
 *   );
 */

"use strict";

const EARTH_RADIUS_KM = 6371;

/**
 * Calculate the Haversine distance between two geographic points.
 *
 * @param {number} lat1  Latitude  of point A (degrees)
 * @param {number} lng1  Longitude of point A (degrees)
 * @param {number} lat2  Latitude  of point B (degrees)
 * @param {number} lng2  Longitude of point B (degrees)
 * @returns {number} Distance in kilometres (floating point)
 */
function haversineKm(lat1, lng1, lat2, lng2) {
  // Convert degrees → radians
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Sort an array of objects by distance from an origin point.
 * Objects that have null/undefined coordinates are placed last.
 *
 * @param {object[]} items       - Array of records with GPS fields
 * @param {{ lat: number, lng: number }} origin - Reference point
 * @param {string} [latField="latitude"]  - Name of latitude field on each item
 * @param {string} [lngField="longitude"] - Name of longitude field on each item
 * @returns {object[]} New array sorted nearest → farthest, each item has ._distanceKm added
 */
function sortByDistance(items, origin, latField = "latitude", lngField = "longitude") {
  return items
    .map((item) => {
      const itemLat = item[latField];
      const itemLng = item[lngField];

      const _distanceKm =
        itemLat != null && itemLng != null
          ? haversineKm(origin.lat, origin.lng, Number(itemLat), Number(itemLng))
          : Infinity;

      return { ...item, _distanceKm };
    })
    .sort((a, b) => a._distanceKm - b._distanceKm);
}

/**
 * Filter items within a given radius from an origin, sorted nearest first.
 *
 * @param {object[]} items
 * @param {{ lat: number, lng: number }} origin
 * @param {number} radiusKm
 * @param {string} [latField="latitude"]
 * @param {string} [lngField="longitude"]
 * @returns {object[]} Items within radius, each with ._distanceKm
 */
function filterWithinRadius(items, origin, radiusKm = 20, latField = "latitude", lngField = "longitude") {
  return sortByDistance(items, origin, latField, lngField).filter(
    (item) => item._distanceKm <= radiusKm
  );
}

module.exports = { haversineKm, sortByDistance, filterWithinRadius };
