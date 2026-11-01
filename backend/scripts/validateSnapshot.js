const fs = require('fs');
const path = require('path');

const target = path.resolve(__dirname, '../../data/devices-status.json');
if (!fs.existsSync(target)) {
  console.error(`Snapshot not found: ${target}`);
  process.exit(1);
}

let snapshot;
try {
  snapshot = JSON.parse(fs.readFileSync(target, 'utf8'));
} catch (error) {
  console.error(`Invalid JSON: ${error.message}`);
  process.exit(1);
}

const required = [
  'schemaVersion', 'lastUpdated', 'status', 'scannedDevices',
  'onlineDevices', 'offlineDevices', 'totalActiveUsers', 'devices', 'users'
];
const missing = required.filter((key) => !(key in snapshot));
if (missing.length) {
  console.error(`Missing required fields: ${missing.join(', ')}`);
  process.exit(1);
}

if (!Array.isArray(snapshot.devices) || !Array.isArray(snapshot.users)) {
  console.error('devices and users must be arrays.');
  process.exit(1);
}

const deviceCounts = {
  scanned: snapshot.devices.length,
  online: snapshot.devices.filter((d) => d.status === 'online').length,
  offline: snapshot.devices.filter((d) => d.status === 'offline').length
};

if (snapshot.scannedDevices !== deviceCounts.scanned ||
    snapshot.onlineDevices !== deviceCounts.online ||
    snapshot.offlineDevices !== deviceCounts.offline) {
  console.error('Device counters do not match the device records.');
  process.exit(1);
}

if (snapshot.totalActiveUsers !== snapshot.users.length) {
  console.error('totalActiveUsers does not match users.length.');
  process.exit(1);
}

for (const [index, device] of snapshot.devices.entries()) {
  if (!device.device || !device.type || !device.status || !device.checkedAt) {
    console.error(`Device record ${index} is missing device/type/status/checkedAt.`);
    process.exit(1);
  }
}

console.log(`Snapshot validation PASS: ${snapshot.devices.length} device(s), ${snapshot.users.length} active user(s).`);
