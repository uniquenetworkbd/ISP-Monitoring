const test = require('node:test');
const assert = require('node:assert/strict');
const { buildHistoryRecord } = require('./historyEngine');

function snapshot(overrides = {}) {
    return {
        schemaVersion: 2,
        lastUpdated: '2026-11-01T16:00:00.000Z',
        status: 'success',
        scannedDevices: 1,
        onlineDevices: 1,
        offlineDevices: 0,
        totalActiveUsers: 1,
        devices: [{ deviceId: 'r1', status: 'online' }],
        users: [{ sourceDeviceTag: 'r1', username: 'user1', address: '10.0.0.2' }],
        ...overrides
    };
}

test('history detects device status changes and user changes', () => {
    const previous = snapshot({
        devices: [{ deviceId: 'r1', status: 'offline' }],
        users: [{ sourceDeviceTag: 'r1', username: 'old-user', address: '10.0.0.3' }],
        totalActiveUsers: 1
    });
    const current = snapshot();
    const record = buildHistoryRecord(previous, current);

    assert.deepEqual(record.deviceChanges, [
        { deviceId: 'r1', change: 'status_changed', from: 'offline', to: 'online' }
    ]);
    assert.deepEqual(record.userChanges, { added: 1, removed: 1 });
    assert.equal(record.activeUsers, 1);
});

test('history detects added and removed devices', () => {
    const previous = snapshot({
        devices: [{ deviceId: 'old-router', status: 'online' }],
        scannedDevices: 1,
        onlineDevices: 1
    });
    const current = snapshot({
        devices: [{ deviceId: 'new-router', status: 'offline' }],
        scannedDevices: 1,
        onlineDevices: 0,
        offlineDevices: 1
    });
    const record = buildHistoryRecord(previous, current);

    assert.deepEqual(record.deviceChanges, [
        { deviceId: 'new-router', change: 'added', from: null, to: 'offline' },
        { deviceId: 'old-router', change: 'removed', from: 'online', to: null }
    ]);
});

const fs = require('fs');
const os = require('os');
const path = require('path');
const { appendHistoryRecord } = require('./historyEngine');

test('persists each history record as a valid JSONL entry', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'isp-history-'));
    const record = { schemaVersion: 1, recordedAt: '2026-11-01T16:00:00.000Z', snapshotStatus: 'success' };
    const target = appendHistoryRecord(directory, record);
    const lines = fs.readFileSync(target, 'utf8').trim().split('\n');
    assert.equal(lines.length, 1);
    assert.deepEqual(JSON.parse(lines[0]), record);
});

test('rejects invalid history timestamps', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'isp-history-invalid-'));
    assert.throws(() => appendHistoryRecord(directory, { recordedAt: 'not-a-date' }), /valid date/);
});
