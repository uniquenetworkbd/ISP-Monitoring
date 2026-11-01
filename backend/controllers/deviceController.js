const Device = require('../models/Device');
const MikroTikService = require('../services/mikrotikService');
const OLTService = require('../services/oltService');
const networkScanner = require('../services/networkScannerService');

function normalizeType(type) {
    const value = String(type || '').trim().toLowerCase();
    if (value === 'mikrotik' || value === 'olt' || value === 'switch') return value;
    return null;
}

async function getDevices(req, res, next) {
    try {
        const devices = await Device.find().sort({ createdAt: -1 }).lean();
        res.status(200).json({ success: true, count: devices.length, data: devices });
    } catch (error) { next(error); }
}

async function addDevice(req, res, next) {
    try {
        const {
            deviceName, name, deviceType, type, deviceIP, ipAddress,
            devicePort, port, deviceUser, username, devicePass, password,
            snmpCommunity, location
        } = req.body;

        const finalName = deviceName || name;
        const finalType = normalizeType(deviceType || type);
        const finalIP = deviceIP || ipAddress;
        const finalPort = Number(devicePort || port || (finalType === 'mikrotik' ? 8728 : 161));
        const finalUser = deviceUser || username;
        const finalPassword = devicePass || password;

        if (!finalName || !finalType || !finalIP || !Number.isInteger(finalPort) || finalPort < 1 || finalPort > 65535) {
            return res.status(400).json({ success: false, error: 'Valid device name, type, IP address and port are required.' });
        }
        if (finalType === 'mikrotik' && (!finalUser || !finalPassword)) {
            return res.status(400).json({ success: false, error: 'MikroTik username and password are required.' });
        }
        if (finalType === 'olt' && !snmpCommunity) {
            return res.status(400).json({ success: false, error: 'Provide an SNMP community string; do not rely on the public default in production.' });
        }

        const device = await Device.create({
            deviceName: finalName,
            deviceType: finalType,
            deviceIP: finalIP,
            devicePort: finalPort,
            deviceUser: finalUser || '',
            devicePass: finalPassword || '',
            snmpCommunity: snmpCommunity || undefined,
            location: location || '',
            status: 'Connecting'
        });

        const safe = device.toObject();
        delete safe.devicePass;
        delete safe.snmpCommunity;
        res.status(201).json({
            success: true,
            message: 'Device registered. Live connectivity will be verified by connection test or scan.',
            data: safe
        });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ success: false, error: 'A device with this name already exists.' });
        next(error);
    }
}

async function testConnection(req, res) {
    try {
        const { deviceType, type, deviceIP, ipAddress, devicePort, port, deviceUser, username, devicePass, password, snmpCommunity } = req.body;
        const finalType = normalizeType(deviceType || type);
        const host = deviceIP || ipAddress;
        const selectedPort = Number(devicePort || port || (finalType === 'mikrotik' ? 8728 : 161));

        if (!host || !finalType) {
            return res.status(400).json({ success: false, error: 'Device type and IP address are required.' });
        }

        if (finalType === 'mikrotik') {
            const service = new MikroTikService(host, deviceUser || username, devicePass || password, selectedPort);
            const [systemInfo] = await Promise.all([service.getSystemResource()]);
            return res.status(200).json({ success: true, message: 'MikroTik RouterOS API responded successfully.', data: systemInfo });
        }
        if (finalType === 'olt') {
            const service = new OLTService(host, snmpCommunity, undefined, { port: selectedPort });
            const systemInfo = await service.getOLTSystemStatus();
            return res.status(200).json({ success: true, message: 'OLT SNMP responded successfully.', data: systemInfo });
        }

        return res.status(400).json({ success: false, error: 'Connection testing is currently supported for MikroTik and OLT only.' });
    } catch (error) {
        res.status(400).json({ success: false, error: 'Connection test failed.', details: error.message });
    }
}

async function triggerScan(req, res, next) {
    try {
        const result = await networkScanner.scanAllDevices();
        const statusCode = result.status === 'already_running' ? 409 : 200;
        res.status(statusCode).json({ success: result.status === 'success', data: result });
    } catch (error) { next(error); }
}

async function deleteDevice(req, res, next) {
    try {
        const device = await Device.findByIdAndDelete(req.params.id);
        if (!device) return res.status(404).json({ success: false, error: 'Device not found.' });
        res.status(200).json({ success: true, message: 'Device deleted.' });
    } catch (error) { next(error); }
}

module.exports = { getDevices, addDevice, testConnection, triggerScan, deleteDevice };
