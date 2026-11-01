const fs = require('fs');
const path = require('path');

function indexDevices(snapshot) {
    return new Map((snapshot?.devices || []).map(device => [device.deviceId, device]));
}

function userKey(user) {
    const identity = user.username || user.user || user.address || user.callerId;
    if (!identity) throw new Error('Active user requires a stable username, user, address, or callerId');
    return `${user.sourceDeviceTag || user.deviceId || 'unknown'}:${String(identity).toLowerCase()}`;
}

function indexUsers(snapshot) {
    return new Map((snapshot?.users || []).map(user => [userKey(user), user]));
}

function buildHistoryRecord(previous, current) {
    if (!current || typeof current !== 'object') throw new Error('Current snapshot is required');

    const previousDevices = indexDevices(previous);
    const currentDevices = indexDevices(current);
    const deviceChanges = [];

    for (const [deviceId, device] of currentDevices) {
        const old = previousDevices.get(deviceId);
        if (!old) deviceChanges.push({ deviceId, change: 'added', from: null, to: device.status });
        else if (old.status !== device.status) deviceChanges.push({ deviceId, change: 'status_changed', from: old.status, to: device.status });
    }
    for (const [deviceId, device] of previousDevices) {
        if (!currentDevices.has(deviceId)) deviceChanges.push({ deviceId, change: 'removed', from: device.status, to: null });
    }

    const previousUsers = indexUsers(previous);
    const currentUsers = indexUsers(current);
    let usersAdded = 0;
    let usersRemoved = 0;
    for (const key of currentUsers.keys()) if (!previousUsers.has(key)) usersAdded += 1;
    for (const key of previousUsers.keys()) if (!currentUsers.has(key)) usersRemoved += 1;

    return {
        schemaVersion: 1,
        recordedAt: current.lastUpdated || new Date().toISOString(),
        snapshotStatus: current.status,
        deviceCounts: { scanned: current.scannedDevices, online: current.onlineDevices, offline: current.offlineDevices },
        activeUsers: current.totalActiveUsers,
        userChanges: { added: usersAdded, removed: usersRemoved },
        deviceChanges
    };
}

function appendHistoryRecord(directory, record) {
    if (!record || typeof record !== 'object' || !record.recordedAt) throw new Error('Valid history record is required');
    const date = new Date(record.recordedAt);
    if (Number.isNaN(date.getTime())) throw new Error('History recordedAt must be a valid date');
    const day = date.toISOString().slice(0, 10);
    const target = path.resolve(directory, `${day}.jsonl`);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.appendFileSync(target, `${JSON.stringify(record)}\\n`, { encoding: 'utf8', mode: 0o644 });
    return target;
}

module.exports = { buildHistoryRecord, appendHistoryRecord };
