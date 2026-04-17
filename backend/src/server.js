// ============================================
// AROGYASEVA HMS - Main Server
// backend/src/server.js
// ============================================

require('dotenv').config()

const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const xss = require('xss-clean')
const hpp = require('hpp')

const { connectDB } = require('./config/db')

const app = express()

/*
============================================
MIDDLEWARE
============================================
*/

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use(cors())
app.use(helmet())
app.use(hpp())

app.use('/api/', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
}))

/*
============================================
HEALTH ROUTE
============================================
*/

app.get('/', (req, res) => {
    res.json({
        message: 'ArogyaSeva HMS Backend Running'
    })
})

/*
============================================
WORKING ROUTES ONLY
============================================
*/

app.use('/api/patients', require('./modules/patients/patients.routes'))

/*
============================================
404 HANDLER
============================================
*/

app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found'
    })
})

/*
============================================
SERVER START
============================================
*/

const PORT = process.env.PORT || 5000

async function startServer() {
    try {

        await connectDB()

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`)
        })

    } catch (err) {
        console.error(err)
    }
}

startServer()