/**
 * ============================================================================
 * ISP MONITORING SYSTEM - USER ROUTES CONFIGURATION
 * Description: Defines API endpoints for synchronized ISP client directories
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const {
    getUsers,
    syncUsers
} = require('../controllers/userController');

// @route   GET /api/users - Get all synchronized client records
// @route   POST /api/users/sync - Synchronize client cache from devices
router.route('/').get(getUsers);
router.route('/sync').post(syncUsers);

module.exports = router;
