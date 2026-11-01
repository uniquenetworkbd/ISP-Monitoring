const { normalizeDevice } = require('./schema');

function normalizeRegistry(input) {
    if (!Array.isArray(input)) throw new Error('Device registry must be an array');
    const devices = input.map(normalizeDevice);
    const ids = new Set();
    for (const device of devices) {
        if (ids.has(device.deviceId)) throw new Error(`Duplicate deviceId: ${device.deviceId}`);
        ids.add(device.deviceId);
    }
    return devices;
}

function findDevice(registry, deviceId) {
    return registry.find(device => device.deviceId === deviceId) || null;
}

module.exports = { normalizeRegistry, findDevice };
