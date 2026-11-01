const fs = require('fs');
const path = require('path');
const { SCHEMA_VERSION, normalizeDevice, validateSnapshot } = require('./schema');

function buildSnapshot(results, users = [], previous = null, now = new Date().toISOString()) {
    const devices = results.map(result => {
        const normalized = normalizeDevice({
            deviceId: result.deviceId || result.device,
            deviceName: result.deviceName || result.device,
            deviceType: result.type,
            deviceIP: result.host,
            devicePort: result.port,
            vendor: result.vendor,
            model: result.model
        });
        return {
            ...normalized,
            status: result.status,
            checkedAt: result.checkedAt || now,
            systemInfo: result.systemInfo || null,
            interfaces: result.interfaces || [],
            activeUsers: result.activeUsers || [],
            onus: result.onus || [],
            error: result.error || null
        };
    });

    const onlineDevices = devices.filter(device => device.status === 'online').length;
    const snapshot = {
        schemaVersion: SCHEMA_VERSION,
        lastUpdated: now,
        status: devices.length === 0 ? 'not_scanned' : onlineDevices === devices.length ? 'success' : onlineDevices > 0 ? 'partial' : 'failed',
        scannedDevices: devices.length,
        onlineDevices,
        offlineDevices: devices.length - onlineDevices,
        totalActiveUsers: users.length,
        devices,
        users,
        previousUpdatedAt: previous?.lastUpdated || null
    };
    validateSnapshot(snapshot);
    return snapshot;
}

function writeSnapshot(target, snapshot) {
    validateSnapshot(snapshot);
    const absolute = path.resolve(target);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    const temporary = `${absolute}.tmp`;
    fs.writeFileSync(temporary, `${JSON.stringify(snapshot, null, 2)}\n`, { mode: 0o644 });
    fs.renameSync(temporary, absolute);
}

module.exports = { buildSnapshot, writeSnapshot };
