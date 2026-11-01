/**
 * ============================================================================
 * ISP MONITORING SYSTEM - DEVICE ROUTES CONFIGURATION
 * Description: Defines API endpoints for Mikrotik, OLT, and Switch operations
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const {
    getDevices,
    addDevice,
    deleteDevice,
    testConnection
} = require('../controllers/deviceController');

// @route   GET /api/devices - Get all devices
// @route   POST /api/devices/add - Register new device
router.route('/').get(getDevices).post(addDevice);

// @route   POST /api/devices/test - Test live API/Telnet connection
router.post('/test', testConnection);

// @route   DELETE /api/devices/:id - Remove connected device
router.route('/:id').delete(deleteDevice);

module.exports = router;
