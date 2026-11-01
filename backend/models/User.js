const mongoose = require('mongoose');

const scannedUserSchema = new mongoose.Schema({
    username: { type: String, required: true, trim: true },
    assignedIP: { type: String, default: '', trim: true },
    // Caller-ID may be unavailable from PPPoE, so it is optional and not globally unique.
    macAddress: { type: String, default: '', trim: true, uppercase: true },
    sourceDeviceTag: { type: String, required: true, trim: true },
    serviceType: { type: String, default: 'PPPoE' },
    uptime: { type: String, default: null },
    status: { type: String, enum: ['Active', 'Offline', 'Blocked'], default: 'Active' },
    lastSync: { type: Date, default: Date.now }
}, { timestamps: true });

scannedUserSchema.index({ username: 1, sourceDeviceTag: 1 }, { unique: true });

module.exports = mongoose.model('ScannedUser', scannedUserSchema);
