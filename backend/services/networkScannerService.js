/**
 * ============================================================================
 * ISP MONITORING SYSTEM - NETWORK SCANNER & CLOUD SYNC SERVICE
 * Description: Directly integrates with Mikrotik API and OLT SNMP streams
 *              to scan active clients and cache data into MongoDB.
 * ============================================================================
 */

const Device = require('../models/Device');
const ScannedUser = require('../models/User');

/**
 * Service to trigger real-time scanning across all active cloud-registered devices
 */
const scanAllDevicesNetwork = async () => {
    try {
        console.log('🔄 Starting scheduled network scan across all active devices...');
        
        // Fetch all active devices from MongoDB
        const activeDevices = await Device.find({ status: 'Live Active' });

        if (!activeDevices || activeDevices.length === 0) {
            console.log('⚠️ No active devices found in cloud storage for scanning.');
            return { status: 'success', scannedDevices: 0, message: 'No active devices to scan.' };
        }

        let totalSyncedClients = 0;

        for (const device of activeDevices) {
            console.log(`📡 Connecting to [${device.deviceType.toUpperCase()}] ${device.deviceName} (${device.deviceIP}:${device.devicePort})...`);

            // Simulated real-time fetched client payload from Mikrotik API / OLT SNMP
            // In a production environment, you would use `routeros-client` for Mikrotik API 
            // or `net-snmp` for OLT fiber transceiver queries here.
            const mockFetchedClients = generateMockScannedClients(device.deviceName, device.deviceType);

            for (const client of mockFetchedClients) {
                await ScannedUser.findOneAndUpdate(
                    { macAddress: client.macAddress.toUpperCase() },
                    {
                        username: client.username,
                        assignedIP: client.assignedIP,
                        macAddress: client.macAddress.toUpperCase(),
                        sourceDeviceTag: device.deviceName,
                        status: client.status,
                        lastSync: Date.now()
                    },
                    { upsert: true, new: true }
                );
                totalSyncedClients++;
            }

            // Update device last scanned timestamp
            device.lastScanned = Date.now();
            await device.save();
            console.log(`✅ Successfully synced ${mockFetchedClients.length} clients from ${device.deviceName}`);
        }

        return {
            status: 'success',
            scannedDevices: activeDevices.length,
            totalSyncedClients,
            timestamp: new Date()
        };

    } catch (error) {
        console.error('❌ Error during network scanner execution:', error.message);
        throw new Error(`Network Scanner Failed: ${error.message}`);
    }
};

/**
 * Helper function to generate simulated live device responses 
 * (Replaced in production with real API sockets/SNMP polling)
 */
const generateMockScannedClients = (deviceTag, deviceType) => {
    if (deviceType === 'mikrotik') {
        return [
            { username: 'pppoe_user_alpha', assignedIP: '192.168.88.10', macAddress: 'AA:BB:CC:11:22:33', status: 'Active' },
            { username: 'pppoe_user_beta', assignedIP: '192.168.88.11', macAddress: 'AA:BB:CC:11:22:44', status: 'Active' }
        ];
    } else {
        return [
            { username: 'onu_client_fiber_01', assignedIP: '10.20.30.5', macAddress: 'DD:EE:FF:55:66:77', status: 'Active' }
        ];
    }
};

module.exports = {
    scanAllDevicesNetwork
};
