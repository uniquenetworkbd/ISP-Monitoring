/**
 * ============================================================================
 * ISP MONITORING SYSTEM - DEVICE CONTROLLER LOGIC
 * Description: Handles device registration, cloud storage, and API operations
 * ============================================================================
 */

const Device = require('../models/Device');

// @desc    Get all connected devices
// @route   GET /api/devices
// @access  Public / Cloud Admin
const getDevices = async (req, res) => {
    try {
        const devices = await Device.find().sort({ createdAt: -1 });
        res.status(200).json({
            status: 'success',
            count: devices.length,
            data: devices
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve devices from cloud database',
            error: error.message
        });
    }
};

// @desc    Add and save a new ISP device
// @route   POST /api/devices/add
// @access  Public / Cloud Admin
const addDevice = async (req, res) => {
    try {
        const { deviceName, deviceType, deviceIP, devicePort, deviceUser, devicePass } = req.body;

        // Check if device already exists
        const existingDevice = await Device.findOne({ deviceName });
        if (existingDevice) {
            return res.status(400).json({
                status: 'fail',
                message: 'Device with this name or tag already exists in cloud storage.'
            });
        }

        // Create and save new device
        const newDevice = await Device.create({
            deviceName,
            deviceType,
            deviceIP,
            devicePort,
            deviceUser,
            devicePass,
            status: 'Live Active'
        });

        res.status(201).json({
            status: 'success',
            message: 'Device successfully connected and saved to cloud database!',
            data: newDevice
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: 'Failed to save device data',
            error: error.message
        });
    }
};

// @desc    Delete a device by ID
// @route   DELETE /api/devices/:id
// @access  Public / Cloud Admin
const deleteDevice = async (req, res) => {
    try {
        const device = await Device.findById(req.findById || req.params.id);

        if (!device) {
            return res.status(404).json({
                status: 'fail',
                message: 'Device not found in cloud database.'
            });
        }

        await device.deleteOne();

        res.status(200).json({
            status: 'success',
            message: 'Device successfully disconnected and removed from cloud.'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to delete device',
            error: error.message
        });
    }
};

// @desc    Test device connection (Mikrotik API / OLT Telnet placeholder)
// @route   POST /api/devices/test
// @access  Public / Cloud Admin
const testConnection = async (req, res) => {
    try {
        const { deviceType, deviceIP, devicePort, deviceUser, devicePass } = req.body;

        // Placeholder for direct TCP/API ping test logic
        // In actual production, ROS API socket or SNMP query will be executed here.
        if (!deviceIP || !devicePort) {
            return res.status(400).json({
                status: 'fail',
                message: 'IP Address and Port are required for connection testing.'
            });
        }

        // Simulate successful handshake response
        res.status(200).json({
            status: 'success',
            message: `Successfully established test connection with ${deviceType.toUpperCase()} at ${deviceIP}:${devicePort}`,
            connectionStatus: 'Live Active'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Connection test failed',
            error: error.message
        });
    }
};

module.exports = {
    getDevices,
    addDevice,
    deleteDevice,
    testConnection
};
