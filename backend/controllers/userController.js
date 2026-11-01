/**
 * ============================================================================
 * ISP MONITORING SYSTEM - USER CONTROLLER LOGIC
 * Description: Handles synchronized ISP client records, search, and cloud caching
 * ============================================================================
 */

const ScannedUser = require('../models/User');

// @desc    Get all synchronized ISP users
// @route   GET /api/users
// @access  Public / Cloud Admin
const getUsers = async (req, res) => {
    try {
        const users = await ScannedUser.find().sort({ lastSync: -1 });
        res.status(200).json({
            status: 'success',
            count: users.length,
            data: users
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve scanned users from cloud database',
            error: error.message
        });
    }
};

// @desc    Sync or Add scanned client records from Mikrotik/OLT
// @route   POST /api/users/sync
// @access  Public / Cloud Admin
const syncUsers = async (req, res) => {
    try {
        const { clients, sourceDeviceTag } = req.body;

        if (!clients || !Array.isArray(clients)) {
            return res.status(400).json({
                status: 'fail',
                message: 'Invalid clients data payload provided for synchronization.'
            });
        }

        let syncedCount = 0;

        for (const client of clients) {
            const { username, assignedIP, macAddress, status } = client;

            // Upsert client record based on MAC address or username
            await ScannedUser.findOneAndUpdate(
                { macAddress: macAddress.toUpperCase() },
                {
                    username,
                    assignedIP,
                    macAddress: macAddress.toUpperCase(),
                    sourceDeviceTag,
                    status: status || 'Active',
                    lastSync: Date.now()
                },
                { upsert: true, new: true }
            );
            syncedCount++;
        }

        res.status(200).json({
            status: 'success',
            message: `Successfully synchronized ${syncedCount} client records to cloud storage.`,
            source: sourceDeviceTag
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to synchronize client records',
            error: error.message
        });
    }
};

module.exports = {
    getUsers,
    syncUsers
};
