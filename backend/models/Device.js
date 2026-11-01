/**
 * ============================================================================
 * ISP MONITORING SYSTEM - DEVICE DATA MODEL SCHEMA
 * Description: Defines Mongoose schema for Mikrotik, OLT, and Switch units
 * ============================================================================
 */

const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
    deviceName: {
        type: String,
        required: [true, 'Device name or tag is required'],
        trim: true,
        unique: true
    },
    deviceType: {
        type: String,
        required: [true, 'Device type is required'],
        enum: ['mikrotik', 'olt', 'switch']
    },
    deviceIP: {
        type: String,
        required: [true, 'IP address / host is required'],
        trim: true
    },
    devicePort: {
        type: Number,
        required: [true, 'API / Management port is required']
    },
    deviceUser: {
        type: String,
        required: [true, 'Device username is required'],
        trim: true
    },
    devicePass: {
        type: String,
        required: [true, 'Device password / secret key is required']
    },
    status: {
        type: String,
        enum: ['Live Active', 'Offline', 'Connecting'],
        default: 'Connecting'
    },
    lastScanned: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Device', deviceSchema);
