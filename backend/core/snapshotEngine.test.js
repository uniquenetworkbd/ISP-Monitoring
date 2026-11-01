const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildSnapshot, writeSnapshot } = require('./snapshotEngine');

test('builds a canonical snapshot with correct counters and previous timestamp', () => {
    const previous = { lastUpdated: '2026-10-31T10:00:00.000Z' };
    const result = { deviceId: 'r1', deviceName: 'Core Router', type: 'mikrotik', host: '192.0.2.1', port: 8728, status: 'online', checkedAt: '2026-11-01T10:00:00.000Z', activeUsers: [{ username: 'subscriber-1' }] };
    const snapshot = buildSnapshot([result], result.activeUsers, previous, '2026-11-01T10:01:00.000Z');
    assert.equal(snapshot.status, 'success');
    assert.equal(snapshot.scannedDevices, 1);
    assert.equal(snapshot.onlineDevices, 1);
    assert.equal(snapshot.totalActiveUsers, 1);
    assert.equal(snapshot.previousUpdatedAt, previous.lastUpdated);
});

test('writes valid JSON atomically and can be parsed back', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'isp-snapshot-'));
    const target = path.join(dir, 'nested', 'snapshot.json');
    const snapshot = buildSnapshot([], [], null, '2026-11-01T10:00:00.000Z');
    writeSnapshot(target, snapshot);
    assert.deepEqual(JSON.parse(fs.readFileSync(target, 'utf8')), snapshot);
    assert.equal(fs.existsSync(target + '.tmp'), false);
});

test('preserves queue telemetry and explicit topology parent links', () => {
    const result = { deviceId: 'olt-1', deviceName: 'POP OLT', type: 'olt', host: '192.0.2.2', port: 161, status: 'online', parentDeviceId: 'core-r1', queues: [{ name: 'q1', rate: '1M/2M' }] };
    const snapshot = buildSnapshot([result], [], null, '2026-11-01T17:00:00.000Z');
    assert.equal(snapshot.devices[0].parentDeviceId, 'core-r1');
    assert.equal(snapshot.devices[0].queues[0].rate, '1M/2M');
});
