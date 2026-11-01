const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
    deviceName: { type: String, required: true, trim: true, unique: true },
    deviceType: { type: String, required: true, enum: ['mikrotik', 'olt', 'switch'], lowercase: true, trim: true },
    deviceIP: { type: String, required: true, trim: true },
    devicePort: { type: Number, required: true, min: 1, max: 65535 },
    deviceUser: { type: String, default: '', trim: true },
    // Credentials are hidden from normal queries. Encrypt these fields at rest before production deployment.
    devicePass: { type: String, default: '', select: false },
    snmpCommunity: { type: String, default: '', select: false },
    location: { type: String, default: '', trim: true },
    status: { type: String, enum: ['Live Active', 'Offline', 'Connecting'], default: 'Connecting' },
    lastScanned: { type: Date, default: null },
    systemInfo: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

module.exports = mongoose.model('Device', deviceSchema);
