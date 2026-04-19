/**
 * Redis client configuration
 * Used for rate-limiting persistence and session caching.
 * If Redis is not available, the app will still work (rate-limiter falls back to in-memory).
 */

let redisClient = null;

try {
  // Only attempt Redis connection if REDIS_URL is set
  if (process.env.REDIS_URL) {
    // Dynamic import so the app doesn't crash if ioredis is not installed
    const Redis = require("ioredis");
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null; // stop retrying
        return Math.min(times * 200, 2000);
      },
    });

    redisClient.on("connect", () => {
      console.log("✅ Redis connected");
    });

    redisClient.on("error", (err) => {
      console.warn("⚠️  Redis error (falling back to in-memory):", err.message);
    });
  }
} catch {
  console.warn("⚠️  Redis not available — using in-memory fallback");
}

module.exports = redisClient;
