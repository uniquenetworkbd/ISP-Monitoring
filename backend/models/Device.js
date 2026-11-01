const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  deviceName: { type: String, required: true, trim: true, unique: true },
  deviceType: { type: String, required: true, enum: ['mikrotik', 'olt', 'switch'] },
  deviceIP: { type: String, required: true, trim: true },
  devicePort: { type: Number, required: true, min: 1, max: 65535 },
  deviceUser: { type: String, required: true, trim: true },
  // Credentials are excluded from normal query results; encrypt at rest before production use.
  devicePass: { type: String, required: true, select: false },
  status: { type: String, enum: ['Live Active', 'Offline', 'Connecting'], default: 'Connecting' },
  lastScanned: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Device', deviceSchema);
