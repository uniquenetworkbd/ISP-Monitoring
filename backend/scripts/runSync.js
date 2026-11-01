/**
 * GitHub-only ISP scanner.
 *
 * Device credentials/configuration are supplied through the ISP_DEVICES_JSON
 * GitHub Actions secret. Never commit credentials into the repository.
 * Output: data/devices-status.json
 */
const fs = require('fs');
const path = require('path');
const MikroTikService = require('../services/mikrotikService');
const OLTService = require('../services/oltService');

function loadDevices() {
    const raw = process.env.ISP_DEVICES_JSON;
    if (!raw) {
        throw new Error('ISP_DEVICES_JSON secret is missing. Configure the device array as a GitHub Actions secret.');
    }
    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch {
        throw new Error('ISP_DEVICES_JSON must contain valid JSON.');
    }
    const devices = Array.isArray(parsed) ? parsed : parsed.devices;
    if (!Array.isArray(devices) || devices.length === 0) {
        throw new Error('ISP_DEVICES_JSON must contain a non-empty devices array.');
    }
    return devices;
}

function safeError(error) {
    // Avoid accidentally publishing credentials embedded in low-level errors.
    return String(error && error.message ? error.message : error)
        .replace(/(password|community|credential)\s*[:=]\s*\S+/ig, '$1=[redacted]')
        .slice(0, 500);
}

async function scanDevice(device) {
    const name = String(device.deviceName || device.name || '').trim();
    const type = String(device.deviceType || device.type || '').toLowerCase();
    const host = String(device.deviceIP || device.host || '').trim();
    if (!name || !host || !['mikrotik', 'olt'].includes(type)) {
        throw new Error('Each device requires deviceName, deviceIP and deviceType (mikrotik or olt).');
    }

    if (type === 'mikrotik') {
        const service = new MikroTikService(
            host,
            device.deviceUser || device.username,
            device.devicePass || device.password,
            device.devicePort || device.port || 8728
        );
        const [systemInfo, activeUsers] = await Promise.all([
            service.getSystemResource(),
            service.getActivePPPoEUsers()
        ]);
        return {
            device: name, type, host, status: 'online',
            checkedAt: new Date().toISOString(),
            systemInfo,
            activeUsers: activeUsers.map(user => ({
                username: user.username,
                address: user.address,
                uptime: user.uptime,
                callerId: user.callerId,
                service: user.service,
                sourceDeviceTag: name,
                status: 'Active'
            }))
        };
    }

    const service = new OLTService(
        host,
        device.snmpCommunity || device.community,
        undefined,
        { port: device.snmpPort || 161, timeout: device.timeout || 5000, retries: 1 }
    );
    const systemInfo = await service.getOLTSystemStatus();
    return {
        device: name, type, host, status: 'online',
        checkedAt: new Date().toISOString(),
        systemInfo,
        activeUsers: []
    };
}

async function main() {
    const devices = loadDevices();
    console.log(`[GitHub-only scanner] Scanning ${devices.length} configured device(s)...`);

    const results = [];
    for (const device of devices) {
        const name = device.deviceName || device.name || 'unnamed-device';
        try {
            results.push(await scanDevice(device));
            console.log(`[OK] ${name}`);
        } catch (error) {
            results.push({
                device: name,
                type: device.deviceType || device.type || 'unknown',
                host: device.deviceIP || device.host || null,
                status: 'offline',
                checkedAt: new Date().toISOString(),
                error: safeError(error),
                activeUsers: []
            });
            console.error(`[FAILED] ${name}: ${safeError(error)}`);
        }
    }

    const onlineDevices = results.filter(item => item.status === 'online').length;
    const activeUsers = results.flatMap(item => item.activeUsers || []);
    const output = {
        schemaVersion: 1,
        lastUpdated: new Date().toISOString(),
        status: onlineDevices === results.length ? 'success' : onlineDevices > 0 ? 'partial' : 'failed',
        scannedDevices: results.length,
        onlineDevices,
        offlineDevices: results.length - onlineDevices,
        totalActiveUsers: activeUsers.length,
        devices: results,
        users: activeUsers
    };

    const dataDir = path.resolve(__dirname, '../../data');
    fs.mkdirSync(dataDir, { recursive: true });
    const target = path.join(dataDir, 'devices-status.json');
    const temporary = target + '.tmp';
    fs.writeFileSync(temporary, JSON.stringify(output, null, 2) + '\n', { mode: 0o644 });
    fs.renameSync(temporary, target);
    console.log(`[GitHub-only scanner] Snapshot written: data/devices-status.json (${onlineDevices}/${results.length} online)`);

    // Preserve the new snapshot even for partial scans; fail the workflow if all devices failed.
    if (onlineDevices === 0) {
        throw new Error('All configured devices failed. Snapshot saved for diagnosis; refusing a successful workflow exit.');
    }
}

main().catch(error => {
    console.error('[GitHub-only scanner] Fatal:', safeError(error));
    process.exitCode = 1;
});
