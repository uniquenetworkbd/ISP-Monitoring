/**
 * GitHub-only ISP scanner entrypoint.
 * Credentials/configuration are supplied through ISP_DEVICES_JSON.
 */
const path = require('path');
const MikroTikService = require('../services/mikrotikService');
const OLTService = require('../services/oltService');
const { normalizeRegistry } = require('../core/deviceRegistry');
const { buildSnapshot, writeSnapshot } = require('../core/snapshotEngine');

function loadDevices() {
    const raw = process.env.ISP_DEVICES_JSON;
    if (!raw) throw new Error('ISP_DEVICES_JSON secret is missing.');
    let parsed;
    try { parsed = JSON.parse(raw); } catch { throw new Error('ISP_DEVICES_JSON must contain valid JSON.'); }
    const devices = Array.isArray(parsed) ? parsed : parsed.devices;
    return normalizeRegistry(devices);
}

function safeError(error) {
    return String(error?.message || error)
        .replace(/(password|community|credential)\s*[:=]\s*\S+/ig, '$1=[redacted]')
        .slice(0, 500);
}

async function scanDevice(device) {
    if (device.deviceType === 'mikrotik') {
        const service = new MikroTikService(
            device.host,
            device.username || device.deviceUser,
            device.password || device.devicePass,
            device.port || 8728
        );
        const [systemInfo, activeUsers] = await Promise.all([
            service.getSystemResource(),
            service.getActivePPPoEUsers()
        ]);
        return {
            deviceId: device.deviceId,
            deviceName: device.deviceName,
            type: device.deviceType,
            host: device.host,
            port: device.port,
            vendor: device.vendor,
            model: device.model,
            status: 'online',
            checkedAt: new Date().toISOString(),
            systemInfo,
            activeUsers: activeUsers.map(user => ({
                username: user.username,
                address: user.address,
                uptime: user.uptime,
                callerId: user.callerId,
                service: user.service,
                sourceDeviceTag: device.deviceId,
                status: 'Active'
            }))
        };
    }

    if (device.deviceType === 'olt') {
        const service = new OLTService(
            device.host,
            device.snmpCommunity || device.community,
            undefined,
            { port: device.port || 161, timeout: device.timeout || 5000, retries: 1 }
        );
        const systemInfo = await service.getOLTSystemStatus();
        return {
            deviceId: device.deviceId,
            deviceName: device.deviceName,
            type: device.deviceType,
            host: device.host,
            port: device.port,
            vendor: device.vendor,
            model: device.model,
            status: 'online',
            checkedAt: new Date().toISOString(),
            systemInfo,
            onus: [],
            activeUsers: []
        };
    }

    throw new Error(`Scanner adapter is not implemented for device type: ${device.deviceType}`);
}

async function main() {
    const devices = loadDevices();
    console.log(`[GitHub-only scanner] Scanning ${devices.length} configured device(s)...`);
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
                deviceId: device.deviceId,
                deviceName: device.deviceName,
                type: device.deviceType,
                host: device.host,
                port: device.port,
                vendor: device.vendor,
                model: device.model,
                status: 'offline',
                checkedAt: new Date().toISOString(),
                error: safeError(error),
                activeUsers: [],
                onus: []
            });
            console.error(`[FAILED] ${device.deviceId}: ${safeError(error)}`);
        }
    }

    const target = path.resolve(__dirname, '../../data/devices-status.json');
    const snapshot = buildSnapshot(results, activeUsers);
    writeSnapshot(target, snapshot);
    console.log(`[GitHub-only scanner] Snapshot written: ${target}`);

    if (snapshot.onlineDevices === 0) {
        throw new Error('All configured devices failed. Snapshot saved for diagnosis; workflow remains failed.');
    }
}

main().catch(error => {
    console.error(`[GitHub-only scanner] Fatal: ${safeError(error)}`);
    process.exitCode = 1;
});
