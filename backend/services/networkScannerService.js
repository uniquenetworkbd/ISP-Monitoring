const Device = require('../models/Device');
const ScannedUser = require('../models/User');

/*
 * Safe scanner orchestration.
 * No fabricated client data is generated. Actual collection requires vendor-specific
 * RouterOS API and OLT SNMP drivers plus device credentials and model mappings.
 */
async function scanAllDevicesNetwork() {
  const devices = await Device.find({ status: { $in: ['Live Active', 'Connecting'] } }).select('+devicePass');
  const results = [];

  for (const device of devices) {
    results.push({
      device: device.deviceName,
      type: device.deviceType,
      status: 'driver_required',
      message: 'No protocol driver is configured; no client records were fabricated.'
    });
    device.status = 'Connecting';
    await device.save();
  }

  return {
    status: 'partial',
    scannedDevices: devices.length,
    syncedClients: 0,
    results,
    timestamp: new Date().toISOString()
  };
}

module.exports = { scanAllDevicesNetwork };
