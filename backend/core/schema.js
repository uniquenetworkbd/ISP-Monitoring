const SCHEMA_VERSION = 2;
const DEVICE_TYPES = new Set(['mikrotik', 'olt', 'switch', 'router']);
const DEVICE_STATES = new Set(['online', 'offline', 'unknown']);
const SNAPSHOT_STATES = new Set(['not_scanned', 'success', 'partial', 'failed', 'scan_error']);

function requiredString(value, field) {
    if ( typeof value !== 'string' || value.trim() === '') throw new Error(`${field} is required`);
    return value.trim();
}

function normalizeDeviceId(value) {
    const id = requiredString(value, 'deviceId').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (!id) throw new Error('deviceId must contain at least one letter or number');
    return id;
}

function normalizeDevice(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Device must be an object');
    const name = requiredString(input.deviceName ?? input.name, 'deviceName');
    const type = String(input.deviceType ?? input.type ?? '').trim().toLowerCase();
    if (!DEVICE_TYPES.has(type)) throw new Error(`Unsupported deviceType: ${type}`);
    const host = requiredString(input.deviceIP ?? input.host, 'deviceIP');
    const deviceId = normalizeDeviceId(input.deviceId || `${type}-${name}-${host}`);
    const port = Number(input.devicePort ?? input.snmpPort ?? input.port ?? (type === 'mikrotik' ? 8728 : 161));
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`Invalid port for device ${deviceId}`);
    return {
        deviceId, deviceName: name, deviceType: type, host, port,
        vendor: input.vendor ? String(input.vendor).trim() : null,
        model: input.model ? String(input.model).trim() : null,
        enabled: input.enabled !== false,
        createdAt: input.createdAt || null,
        updatedAt: input.updatedAt || null
    };
}

function validateSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) throw new Error('Snapshot must be an object');
    if (snapshot.schemaVersion !== SCHEMA_VERSION) throw new Error(`Unsupported schemaVersion: ${snapshot.schemaVersion}`);
    if (!SNAPSHOT_STATES.has(snapshot.status)) throw new Error(`Invalid snapshot status: ${snapshot.status}`);
    if (!Array.isArray(snapshot.devices) || !Array.isArray(snapshot.users)) throw new Error('devices and users must be arrays');

    for (const field of ['scannedDevices', 'onlineDevices', 'offlineDevices', 'totalActiveUsers']) {
        if (!Number.isSafeInteger(snapshot[field]) || snapshot[field] < 0) throw new Error(`${field} must be a non-negative integer`);
    }
    const ids = new Set();
    for (const [index, device] of snapshot.devices.entries()) {
        if (!device || typeof device !== 'object') throw new Error(`Device ${index}: must be an object`);
        const id = requiredString(device.deviceId, `Device ${index} deviceId`);
        if (ids.has(id)) throw new Error(`Duplicate deviceId: ${id}`);
        ids.add(id);
        if (!DEVICE_TYPES.has(device.type)) throw new Error(`Device ${index}: invalid type`);
        if (!DEVICE_STATES.has(device.status)) throw new Error(`Device ${index}: invalid status`);
        requiredString(device.deviceName, `Device ${index} deviceName`);
        requiredString(device.host, `Device ${index} host`);
        if (!Number.isInteger(device.port) || device.port < 1 || device.port > 65535) throw new Error(`Device ${index}: invalid port`);
        if (!device.checkedAt || Number.isNaN(Date.parse(device.checkedAt))) throw new Error(`Device ${index}: checkedAt must be a valid date`);
    }
    for (const [index, user] of snapshot.users.entries()) {
        if (!user || typeof user !== 'object' || Array.isArray(user)) throw new Error(`User ${index}: must be an object`);
        if (!user.username && !user.user && !user.address && !user.callerId) throw new Error(`User ${index}: stable identity is required`);
    }
    const online = snapshot.devices.filter(device => device.status === 'online').length;
    const offline = snapshot.devices.filter(device => device.status === 'offline').length;
    if (snapshot.scannedDevices !== snapshot.devices.length) throw new Error('scannedDevices counter mismatch');
    if (snapshot.onlineDevices !== online) throw new Error('onlineDevices counter mismatch');
    if (snapshot.offlineDevices !== offline) throw new Error('offlineDevices counter mismatch');
    if (snapshot.totalActiveUsers !== snapshot.users.length) throw new Error('totalActiveUsers counter mismatch');
    return true;
}

function createEmptySnapshot() {
    return {
        schemaVersion: SCHEMA_VERSION, lastUpdated: null, status: 'not_scanned',
        scannedDevices: 0, onlineDevices: 0, offlineDevices: 0, totalActiveUsers: 0,
        devices: [], users: [], previousUpdatedAt: null
    };
}

module.exports = { SCHEMA_VERSION, DEVICE_TYPES, normalizeDeviceId, normalizeDevice, validateSnapshot, createEmptySnapshot };
