/**
 * On-demand ISP network scan for GitHub Actions.
 *
 * Required environment:
 *   MONGO_URI - MongoDB connection string stored as a GitHub Actions secret.
 *
 * The runner must have network reachability to every configured router/OLT.
 */

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const networkScanner = require('../services/networkScannerService');

async function executeSync() {
    let exitCode = 0;

    try {
        console.log('[On-Demand Scanner] Connecting to MongoDB...');
        await connectDB();

        console.log('[On-Demand Scanner] Starting MikroTik / OLT polling...');
        const summary = await networkScanner.scanAllDevices();

        console.log('[On-Demand Scanner] Result summary:');
        console.log(JSON.stringify(summary, null, 2));

        if (!summary || !Number(summary.scannedDevices)) {
            throw new Error('No monitoring devices were scanned. Check the Device collection.');
        }

        if (summary.status !== 'success') {
            throw new Error('One or more devices failed or were unsupported; inspect the scan results above.');
        }

        console.log('[On-Demand Scanner] Scan and database sync completed.');
    } catch (error) {
        console.error('[On-Demand Scanner] Execution failed:', error.stack || error.message);
        exitCode = 1;
    } finally {
        try {
            if (mongoose.connection.readyState !== 0) {
                await mongoose.disconnect();
                console.log('[On-Demand Scanner] MongoDB connection closed.');
            }
        } catch (closeError) {
            console.error('[On-Demand Scanner] MongoDB cleanup failed:', closeError.message);
            exitCode = 1;
        }
        process.exitCode = exitCode;
    }
}

executeSync();
