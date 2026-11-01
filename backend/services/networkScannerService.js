const Device = require('../models/Device');
const ScannedUser = require('../models/User');
const MikroTikService = require('./mikrotikService');
const OLTService = require('./oltService');

let scanInProgress = false;

class NetworkScannerService {
    async scanAllDevices() {
        if (scanInProgress) {
            return { status: 'already_running', scannedDevices: 0, results: [] };
        }

        scanInProgress = true;
        const results = [];

        try {
            // Device credentials are select:false in the schema and are loaded only here.
            const devices = await Device.find({}).select('+devicePass +snmpCommunity');

            for (const device of devices) {
                try {
                    const type = String(device.deviceType || '').toLowerCase();

                    if (type === 'mikrotik') {
                        const data = await this.syncMikroTikDevice(device);
                        results.push({ device: device.deviceName, type, status: 'online', ...data });
                    } else if (type === 'olt') {
                        const data = await this.syncOltDevice(device);
                        results.push({ device: device.deviceName, type, status: 'online', ...data });
                    } else {
                        results.push({ device: device.deviceName, type, status: 'unsupported', message: 'No scanner is configured for this device type.' });
                    }
                } catch (deviceError) {
                    device.status = 'Offline';
                    device.lastScanned = new Date();
                    await device.save();
                    results.push({
                        device: device.deviceName,
                        type: device.deviceType,
                        status: 'offline',
                        error: deviceError.message
                    });
                }
            }

            const online = results.filter(item => item.status === 'online').length;
            return {
                status: results.length === online ? 'success' : 'partial',
                scannedDevices: results.length,
                onlineDevices: online,
                offlineDevices: results.filter(item => item.status === 'offline').length,
                syncedClients: results.reduce((sum, item) => sum + (item.syncedUsers || 0), 0),
                results,
                timestamp: new Date().toISOString()
            };
        } finally {
            scanInProgress = false;
        }
    }

    async syncMikroTikDevice(device) {
        const service = new MikroTikService(
            device.deviceIP,
            device.deviceUser,
            device.devicePass,
            device.devicePort || 8728
        );

        const [system, activeUsers] = await Promise.all([
            service.getSystemResource(),
            service.getActivePPPoEUsers()
        ]);

        device.status = 'Live Active';
        device.lastScanned = new Date();
        device.systemInfo = {
            uptime: system.uptime,
            cpuLoad: system.cpuLoad,
            freeMemory: system.freeMemory,
            totalMemory: system.totalMemory,
            boardName: system.boardName,
            version: system.version
        };
        await device.save();

        // Mark this router's previous sessions offline, then reactivate current sessions.
        await ScannedUser.updateMany(
            { sourceDeviceTag: device.deviceName },
            { $set: { status: 'Offline', lastSync: new Date() } }
        );

        for (const user of activeUsers) {
            const identity = {
                username: user.username,
                sourceDeviceTag: device.deviceName
            };
            const update = {
                assignedIP: user.address || 'Unknown',
                status: 'Active',
                uptime: user.uptime || null,
                lastSync: new Date()
            };
            if (user.callerId && user.callerId !== 'N/A') {
                update.macAddress = user.callerId;
            }

            await ScannedUser.findOneAndUpdate(
                identity,
                { $set: update, $setOnInsert: identity },
                { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
            );
        }

        return { syncedUsers: activeUsers.length, systemInfo: device.systemInfo };
    }

    async syncOltDevice(device) {
        const service = new OLTService(
            device.deviceIP,
            device.snmpCommunity || 'public'
        );
        const status = await service.getOLTSystemStatus();

        device.status = 'Live Active';
        device.lastScanned = new Date();
        device.systemInfo = {
            uptime: status.uptime,
            description: status.deviceDescription
        };
        await device.save();

        return { systemInfo: device.systemInfo };
    }
}

module.exports = new NetworkScannerService();
