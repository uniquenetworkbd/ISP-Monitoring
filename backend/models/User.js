/**
 * ============================================================================
 * ISP MONITORING SYSTEM - SCANNED USERS DATA MODEL SCHEMA
 * Description: Defines Mongoose schema for ISP clients synced from Mikrotik & OLT
 * ============================================================================
 */

const mongoose = require('mongoose');

const scannedUserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Client username is required'],
        trim: true,
        index: true
    },
    assignedIP: {
        type: String,
        required: [true, 'Assigned IP address is required'],
        trim: true
    },
    macAddress: {
        type: String,
        required: [true, 'MAC address is required'],
        trim: true,
        uppercase: true
    },
    sourceDeviceTag: {
        type: String,
        required: [true, 'Source device tag or name is required'],
        trim: true
    },
    status: {
        type: String,
        enum: ['Active', 'Offline', 'Blocked'],
        default: 'Active'
    },
    lastSync: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('ScannedUser', scannedUserSchema);
