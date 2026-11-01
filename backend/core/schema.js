const SCHEMA_VERSION = 2;
const DEVICE_TYPES = new Set(['mikrotik', 'olt', 'switch', 'router']);
const DEVICE_STATES = new Set(['online', 'offline', 'unknown']);

function requiredString(value, field) {
    if (typeof value !== 'string' || value.trim() === '') throw new Error(`${field} is required`);
    return value.trim();
}

function normalizeDeviceId(value) {
    return requiredString(value, 'deviceId')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function normalizeDevice(input) {
    const name = requiredString(input.deviceName ?? input.name, 'deviceName');
    const type = String(input.deviceType ?? input.type ?? '').trim().toLowerCase();
    if (!DEVICE_TYPES.has(type)) throw new Error(`Unsupported deviceType: ${type}`);
    const host = requiredString(input.deviceIP ?? input.host, 'deviceIP');
    const deviceId = normalizeDeviceId(input.deviceId || `${type}-${name}-${host}`);
    return {
        deviceId,
        deviceName: name,
        deviceType: type,
        host,
        port: Number(input.devicePort ?? input.port ?? (type === 'mikrotik' ? 8728 : 161)),
        vendor: input.vendor ? String(input.vendor).trim() : null,
        model: input.model ? String(input.model).trim() : null,
        enabled: input.enabled !== false,
        createdAt: input.createdAt || null,
        updatedAt: input.updatedAt || null
    };
}

function validateSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') throw new Error('Snapshot must be an object');
    if (snapshot.schemaVersion !== SCHEMA_VERSION) throw new Error(`Unsupported schemaVersion: ${snapshot.schemaVersion}`);
    if (!Array.isArray(snapshot.devices) || !Array.isArray(snapshot.users)) throw new Error('devices and users must be arrays');
    const ids = new Set();
    for (const [index, device] of snapshot.devices.entries()) {
        if (!device.deviceId) throw new Error(`Device ${index}: deviceId is required`);
        if (ids.has(device.deviceId)) throw new Error(`Duplicate deviceId: ${device.deviceId}`);
        ids.add(device.deviceId);
        if (!DEVICE_TYPES.has(device.type)) throw new Error(`Device ${index}: invalid type`);
        if (!DEVICE_STATES.has(device.status)) throw new Error(`Device ${index}: invalid status`);
        if (!device.checkedAt) throw new Error(`Device ${index}: checkedAt is required`);
    }
    const online = snapshot.devices.filter(d => d.status === 'online').length;
    const offline = snapshot.devices.filter(d => d.status === 'offline').length;
    if (snapshot.scannedDevices !== snapshot.devices.length) throw new Error('scannedDevices counter mismatch');
    if (snapshot.onlineDevices !== online) throw new Error('onlineDevices counter mismatch');
    if (snapshot.offlineDevices !== offline) throw new Error('offlineDevices counter mismatch');
    if (snapshot.totalActiveUsers !== snapshot.users.length) throw new Error('totalActiveUsers counter mismatch');
    return true;
}

function createEmptySnapshot() {
    return {
        schemaVersion: SCHEMA_VERSION,
        lastUpdated: null,
        status: 'not_scanned',
        scannedDevices: 0,
        onlineDevices: 0,
        offlineDevices: 0,
        totalActiveUsers: 0,
        devices: [],
        users: []
    };
}

module.exports = { SCHEMA_VERSION, DEVICE_TYPES, normalizeDeviceId, normalizeDevice, validateSnapshot, createEmptySnapshot };
