/**
 * ============================================================================
 * ISP MONITORING SYSTEM - CLOUD BACKEND SERVER
 * ============================================================================
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const deviceRoutes = require('./routes/deviceRoutes');
const userRoutes = require('./routes/userRoutes');
const networkScanner = require('./services/networkScannerService');

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const SCAN_INTERVAL_MS = Math.max(1, Number(process.env.SCAN_INTERVAL_MINUTES) || 5) * 60 * 1000;

app.disable('x-powered-by');

const configuredOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

const allowedOrigins = new Set([
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    'https://uniquenetworkbd.github.io',
    ...configuredOrigins
]);

app.use(cors({
    origin(origin, callback) {
        // Allow non-browser clients (e.g. server-to-server/CLI) without Origin.
        if (!origin || allowedOrigins.has(origin)) return callback(null, true);
        return callback(new Error('Origin is not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.get('/', (req, res) => res.status(200).json({
    status: 'success',
    system: 'ISP Enterprise Cloud Network Monitoring System',
    version: '2.0.0',
    timestamp: new Date().toISOString()
}));

app.get('/health', (req, res) => {
    const databaseConnected = mongoose.connection.readyState === 1;
    res.status(databaseConnected ? 200 : 503).json({
        status: databaseConnected ? 'ok' : 'degraded',
        database: databaseConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

app.use('/api/devices', deviceRoutes);
app.use('/api/users', userRoutes);

// Backward-compatible scan endpoint; primary endpoint is POST /api/devices/scan.
app.post('/api/scan', async (req, res, next) => {
    try {
        const result = await networkScanner.scanAllDevices();
        const statusCode = result.status === 'already_running' ? 409 : 200;
        res.status(statusCode).json({ success: result.status === 'success', data: result });
    } catch (error) {
        next(error);
    }
});

app.use((req, res) => res.status(404).json({
    success: false,
    message: `Cannot find endpoint [${req.method} ${req.originalUrl}]`
}));

app.use((error, req, res, next) => {
    console.error('[API Error]', error.message);
    const status = error.status || (error.message === 'Origin is not allowed by CORS' ? 403 : 500);
    res.status(status).json({
        success: false,
        error: error.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' ? { stack: error.stack } : {})
    });
});

let server;
let scanTimer;

async function startServer() {
    // Do not accept API traffic or start polling until MongoDB is ready.
    await connectDB();

    server = app.listen(PORT, () => {
        console.log(`ISP Monitoring API listening on port ${PORT}`);
        console.log(`Automatic network polling interval: ${SCAN_INTERVAL_MS / 60000} minute(s)`);
    });

    scanTimer = setInterval(async () => {
        try {
            console.log('[Scheduler] Starting scheduled network scan...');
            const result = await networkScanner.scanAllDevices();
            console.log('[Scheduler] Scan result:', result.status, result.scannedDevices || 0);
        } catch (error) {
            console.error('[Scheduler] Network scan failed:', error.message);
        }
    }, SCAN_INTERVAL_MS);

    if (typeof scanTimer.unref === 'function') scanTimer.unref();
}

async function shutdown(signal) {
    console.log(`[Server] ${signal} received; shutting down...`);
    if (scanTimer) clearInterval(scanTimer);

    if (server) {
        await new Promise(resolve => server.close(resolve));
    }
    await mongoose.disconnect();
    process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

startServer().catch(error => {
    console.error('[Startup] Backend failed to start:', error.message);
    process.exit(1);
});

module.exports = app;
