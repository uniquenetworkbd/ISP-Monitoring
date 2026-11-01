/**
 * GitHub-only ISP scanner entrypoint.
 * Credentials/configuration are supplied through ISP_DEVICES_JSON.
 */
const fs = require('fs');
const path = require('path');
const MikroTikService = require('../services/mikrotikService');
const OLTService = require('../services/oltService');
const { normalizeRegistry } = require('../core/deviceRegistry');
const { validateSnapshot } = require('../core/schema');
const { buildSnapshot, writeSnapshot } = require('../core/snapshotEngine');
const { buildHistoryRecord, appendHistoryRecord } = require('../core/historyEngine');

function loadDevices() {
    const raw = process.env.ISP_DEVICES_JSON;
    if (!raw) throw new Error('ISP_DEVICES_JSON secret is missing.');
    let parsed;
    try { parsed = JSON.parse(raw); } catch { throw new Error('ISP_DEVICES_JSON must contain valid JSON.'); }
    const input = Array.isArray(parsed) ? parsed : parsed.devices;
    if (!Array.isArray(input) || input.length === 0) throw new Error('ISP_DEVICES_JSON must contain a non-empty devices array.');
    const registry = normalizeRegistry(input);
    const credentialsById = new Map(registry.map((device, index) => [device.deviceId, input[index]]));
    const enabled = registry.filter(device => device.enabled);
    if (enabled.length === 0) throw new Error('Device registry contains no enabled devices.');
    return enabled.map(device => {
        const source = credentialsById.get(device.deviceId) || {};
        return {
            ...device,
            username: source.deviceUser || source.username,
            password: source.devicePass || source.password,
            snmpCommunity: source.snmpCommunity || source.community,
            timeout: source.timeout
        };
    });
}

function safeError(error) {
    return String(error?.message || error)
        .replace(/(password|community|credential)\s*[:=]\s*\S+/ig, '$1=[redacted]')
        .slice(0, 500);
}

function readPreviousSnapshot(target) {
    if (!fs.existsSync(target)) return null;
    let snapshot;
    try { snapshot = JSON.parse(fs.readFileSync(target, 'utf8')); }
    catch (error) { throw new Error(`Existing snapshot is not valid JSON: ${error.message}`); }
    validateSnapshot(snapshot);
    return snapshot;
}

async function scanDevice(device) {
    if (device.deviceType === 'mikrotik') {
        const service = new MikroTikService(device.host, device.username, device.password, device.port || 8728);
        const [systemInfo, activeUsers] = await Promise.all([
            service.getSystemResource(),
            service.getActivePPPoEUsers()
        ]);
        return {
            deviceId: device.deviceId, deviceName: device.deviceName, type: device.deviceType,
            host: device.host, port: device.port, vendor: device.vendor, model: device.model,
            status: 'online', checkedAt: new Date().toISOString(), systemInfo,
            activeUsers: activeUsers.map(user => ({
                username: user.username, address: user.address, uptime: user.uptime,
                callerId: user.callerId, service: user.service, sourceDeviceTag: device.deviceId, status: 'Active'
            }))
        };
    }

    if (device.deviceType === 'olt') {
        if (!device.snmpCommunity) throw new Error('OLT SNMP community is required');
        const service = new OLTService(device.host, device.snmpCommunity, undefined, {
            port: device.port || 161, timeout: device.timeout || 5000, retries: 1
        });
        const systemInfo = await service.getOLTSystemStatus();
        return {
            deviceId: device.deviceId, deviceName: device.deviceName, type: device.deviceType,
            host: device.host, port: device.port, vendor: device.vendor, model: device.model,
            status: 'online', checkedAt: new Date().toISOString(), systemInfo, onus: [], activeUsers: []
        };
    }

    throw new Error(`Scanner adapter is not implemented for device type: ${device.deviceType}`);
}

async function main() {
    const devices = loadDevices();
    const target = path.resolve(__dirname, '../../data/devices-status.json');
    const previous = readPreviousSnapshot(target);
    console.log(`[GitHub-only scanner] Scanning ${devices.length} enabled device(s)...`);
    const results = [];
    const activeUsers = [];

    for (const device of devices) {
        try {
            const result = await scanDevice(device);
            results.push(result);
            activeUsers.push(...(result.activeUsers || []));
            console.log(`[OK] ${device.deviceId}`);
        } catch (error) {
            results.push({
                deviceId: device.deviceId, deviceName: device.deviceName, type: device.deviceType,
                host: device.host, port: device.port, vendor: device.vendor, model: device.model,
                status: 'offline', checkedAt: new Date().toISOString(), error: safeError(error),
                activeUsers: [], onus: []
            });
            console.error(`[FAILED] ${device.deviceId}: ${safeError(error)}`);
        }
    }

    const snapshot = buildSnapshot(results, activeUsers, previous);
    writeSnapshot(target, snapshot);
    const historyRecord = buildHistoryRecord(previous, snapshot);
    const historyPath = appendHistoryRecord(path.resolve(__dirname, '../../data/history'), historyRecord);
    console.log(`[GitHub-only scanner] Snapshot written: ${target}`);
    console.log(`[GitHub-only scanner] History appended: ${historyPath}`);

    if (snapshot.onlineDevices === 0) throw new Error('All configured devices failed. Snapshot and history saved for diagnosis; workflow remains failed.');
}

main().catch(error => {
    console.error(`[GitHub-only scanner] Fatal: ${safeError(error)}`);
    process.exitCode = 1;
});
