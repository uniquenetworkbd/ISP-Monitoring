function indexDevices(snapshot) {
    return new Map((snapshot?.devices || []).map(device => [device.deviceId, device]));
}

function indexUsers(snapshot) {
    return new Map((snapshot?.users || []).map(user => [
        `${user.sourceDeviceTag || user.deviceId || 'unknown'}:${user.username || user.user || user.address || ''}`,
        user
    ]));
}

function buildHistoryRecord(previous, current) {
    if (!current || typeof current !== 'object') throw new Error('Current snapshot is required');

    const previousDevices = indexDevices(previous);
    const currentDevices = indexDevices(current);
    const deviceChanges = [];

    for (const [deviceId, device] of currentDevices) {
        const old = previousDevices.get(deviceId);
        if (!old) {
            deviceChanges.push({ deviceId, change: 'added', from: null, to: device.status });
        } else if (old.status !== device.status) {
            deviceChanges.push({ deviceId, change: 'status_changed', from: old.status, to: device.status });
        }
    }

    for (const [deviceId, device] of previousDevices) {
        if (!currentDevices.has(deviceId)) {
            deviceChanges.push({ deviceId, change: 'removed', from: device.status, to: null });
        }
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
        deviceCounts: {
            scanned: current.scannedDevices,
            online: current.onlineDevices,
            offline: current.offlineDevices
        },
        activeUsers: current.totalActiveUsers,
        userChanges: { added: usersAdded, removed: usersRemoved },
        deviceChanges
    };
}

module.exports = { buildHistoryRecord };
