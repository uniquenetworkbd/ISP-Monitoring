const mongoose = require('mongoose');

const scannedUserSchema = new mongoose.Schema({
  username: { type: String, required: true, trim: true, index: true },
  assignedIP: { type: String, required: true, trim: true },
  macAddress: { type: String, required: true, trim: true, uppercase: true, unique: true },
  sourceDeviceTag: { type: String, required: true, trim: true },
  status: { type: String, enum: ['Active', 'Offline', 'Blocked'], default: 'Active' },
  lastSync: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('ScannedUser', scannedUserSchema);
