// ============================================
// AROGYASEVA HMS - Database Connection
// backend/src/config/db.js
// ============================================

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'info', 'warn', 'error']
    : ['error'],

  errorFormat: 'pretty',
})

// Test connection on startup
async function connectDB() {
  try {
    await prisma.$connect()
    console.log('✅ PostgreSQL connected via Prisma')
  } catch (err) {
    console.error('❌ Database connection failed:', err.message)
    process.exit(1)
  }
}

// Graceful disconnect on shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect()
  console.log('🔌 Database disconnected gracefully')
  process.exit(0)
})

module.exports = { prisma, connectDB }
