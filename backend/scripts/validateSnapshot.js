const fs = require('fs');
const path = require('path');
const { validateSnapshot } = require('../core/schema');

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

try {
    validateSnapshot(snapshot);
    console.log(`Snapshot validation PASS: ${snapshot.devices.length} device(s), ${snapshot.users.length} active user(s), schema v${snapshot.schemaVersion}.`);
} catch (error) {
    console.error(`Snapshot validation FAIL: ${error.message}`);
    process.exit(1);
}
