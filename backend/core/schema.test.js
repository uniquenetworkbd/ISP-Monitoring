const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeDevice, validateSnapshot, createEmptySnapshot } = require('./schema');

test('normalizes device identity, type and default port', () => {
    const device = normalizeDevice({ name: 'Core Router', type: 'mikrotik', host: '192.0.2.1' });
    assert.equal(device.deviceId, 'mikrotik-core-router-192-0-2-1');
    assert.equal(device.port, 8728);
    assert.equal(device.enabled, true);
});

test('rejects invalid ports and unsupported device types', () => {
    assert.throws(() => normalizeDevice({ name: 'bad', type: 'mikrotik', host: 'router', port: 70000 }), /Invalid port/);
    assert.throws(() => normalizeDevice({ name: 'bad', type: 'unknown', host: 'router' }), /Unsupported deviceType/);
});

test('accepts canonical empty snapshot and rejects counter drift', () => {
    assert.equal(validateSnapshot(createEmptySnapshot()), true);
    const invalid = { ...createEmptySnapshot(), scannedDevices: 1 };
    assert.throws(() => validateSnapshot(invalid), /scannedDevices counter mismatch/);
});

test('rejects duplicate devices and invalid user identity', () => {
    const base = createEmptySnapshot();
    const device = { deviceId: 'r1', deviceName: 'Router', type: 'mikrotik', host: '192.0.2.2', port: 8728, status: 'online', checkedAt: '2026-11-01T00:00:00.000Z' };
    const duplicate = { ...base, status: 'success', scannedDevices: 2, onlineDevices: 2, devices: [device, device] };
    assert.throws(() => validateSnapshot(duplicate), /Duplicate deviceId/);
    const badUser = { ...base, users: [{}], totalActiveUsers: 1 };
    assert.throws(() => validateSnapshot(badUser), /stable identity/);
});

test('uses snmpPort as the OLT management port when devicePort is absent', () => {
    const device = normalizeDevice({ deviceName: 'POP OLT', deviceType: 'olt', deviceIP: '192.0.2.20', snmpPort: 1161 });
    assert.equal(device.port, 1161);
});
