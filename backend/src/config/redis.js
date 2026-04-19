// backend/src/config/redis.js
// Redis client — supports both local Redis and Upstash (cloud)

const { createClient } = require('redis')

let client = null
let isConnected = false

async function getRedisClient() {
  if (client && isConnected) return client

  client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          console.error('Redis: Max reconnection attempts reached')
          return new Error('Redis max retries')
        }
        return Math.min(retries * 100, 3000) // exponential backoff, max 3s
      },
    },
  })

  client.on('connect', () => {
    isConnected = true
    console.log('✅ Redis connected')
  })

  client.on('error', (err) => {
    isConnected = false
    console.error('❌ Redis error:', err.message)
  })

  client.on('reconnecting', () => {
    console.log('⏳ Redis reconnecting...')
  })

  client.on('end', () => {
    isConnected = false
  })

  await client.connect()
  return client
}

// ─── Helper functions ─────────────────────────────────────────────────────────

/**
 * Store a value with optional TTL
 * @param {string} key
 * @param {any} value  (objects are JSON-serialized automatically)
 * @param {number} ttlSeconds  optional expiry in seconds
 */
async function set(key, value, ttlSeconds = null) {
  const redis = await getRedisClient()
  const serialized = typeof value === 'object' ? JSON.stringify(value) : String(value)
  if (ttlSeconds) {
    await redis.setEx(key, ttlSeconds, serialized)
  } else {
    await redis.set(key, serialized)
  }
}

/**
 * Get a value — returns parsed object if JSON, raw string otherwise
 */
async function get(key) {
  const redis = await getRedisClient()
  const val = await redis.get(key)
  if (val === null) return null
  try {
    return JSON.parse(val)
  } catch {
    return val
  }
}

/**
 * Delete a key
 */
async function del(key) {
  const redis = await getRedisClient()
  return redis.del(key)
}

/**
 * Increment a counter (for rate limiting)
 */
async function incr(key) {
  const redis = await getRedisClient()
  return redis.incr(key)
}

/**
 * Set expiry on existing key
 */
async function expire(key, ttlSeconds) {
  const redis = await getRedisClient()
  return redis.expire(key, ttlSeconds)
}

// ─── Common key patterns ──────────────────────────────────────────────────────
const KEYS = {
  OTP: (phone) => `otp:${phone}`,
  SESSION: (userId) => `session:${userId}`,
  PATIENT_CACHE: (id) => `patient:${id}`,
  RATE_LIMIT: (ip, route) => `rl:${ip}:${route}`,
  LOGIN_ATTEMPTS: (ip) => `login_attempts:${ip}`,
  SOS_COOLDOWN: (userId) => `sos_cd:${userId}`,
  MEDICINE_CATALOG: () => 'cache:medicines',
  HOSPITAL_SETTINGS: () => 'cache:hospital_settings',
}

// TTL constants (seconds)
const TTL = {
  OTP: 5 * 60,               // 5 minutes
  SESSION: 7 * 24 * 3600,    // 7 days
  PATIENT_CACHE: 3600,        // 1 hour
  MEDICINE_CATALOG: 6 * 3600, // 6 hours
  RATE_LIMIT_WINDOW: 15 * 60, // 15 minutes
  SOS_COOLDOWN: 5 * 60,       // 5 minutes
}

module.exports = {
  getRedisClient,
  set,
  get,
  del,
  incr,
  expire,
  KEYS,
  TTL,
}