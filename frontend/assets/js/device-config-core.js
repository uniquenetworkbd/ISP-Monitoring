/* Shared device form validation and GitHub secret payload builder. No persistence. */
(function (root) {
    'use strict';
    const SUPPORTED = new Set(['mikrotik', 'olt']);
    const OID = /^(?:[0-9]+\.)*[0-9]+$/;
    function isValidHost(host) {
        if (!host || host.length > 253 || host.includes('://') || /\s/.test(host)) return false;
        if (/^\d+(?:\.\d+){3}$/.test(host)) return host.split('.').every(part => Number(part) >= 0 && Number(part) <= 255 && String(Number(part)) === part);
        return host.split('.').every(label => label.length >= 1 && label.length <= 63 && /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(label));
    }
    function optionalOid(value, field) {
        const oid = String(value || '').trim();
        if (oid && !OID.test(oid)) throw new Error(field + ' must be a numeric dotted OID.');
        return oid || null;
    }
    function positiveDivisor(value, field) {
        if (value === undefined || value === null || String(value).trim() === '') return null;
        const n = Number(value);
        if (!Number.isFinite(n) || n <= 0) throw new Error(field + ' must be a positive number.');
        return n;
    }
    function normalizeDeviceForm(input) {
        const type = String(input.deviceType || '').trim().toLowerCase();
        const name = String(input.deviceName || '').trim();
        const host = String(input.deviceIP || '').trim();
        if (!SUPPORTED.has(type)) throw new Error('Only MikroTik and OLT are currently supported by the scanner.');
        if (name.length < 2 || name.length > 80) throw new Error('Device name must be 2–80 characters.');
        if (!isValidHost(host)) throw new Error('Enter a valid hostname or IPv4 address.');
        const port = Number(input.devicePort || input.snmpPort || (type === 'mikrotik' ? 8728 : 161));
        if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Port must be an integer from 1 to 65535.');
        const parentDeviceId = String(input.parentDeviceId || '').trim();
        if (parentDeviceId && !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(parentDeviceId)) throw new Error('Parent device ID may contain letters, numbers, dot, underscore and hyphen only.');
        const device = { deviceName: name, deviceType: type, deviceIP: host, devicePort: port, vendor: String(input.deviceVendor || input.vendor || '').trim() || undefined, model: String(input.deviceModel || input.model || '').trim() || undefined, parentDeviceId: parentDeviceId || undefined };
        if (type === 'mikrotik') {
            device.deviceUser = String(input.deviceUser || '').trim();
            device.devicePass = String(input.devicePass || '');
            if (!device.deviceUser || !device.devicePass) throw new Error('MikroTik username and password are required.');
        } else {
            device.snmpPort = port;
            device.snmpCommunity = String(input.snmpCommunity || '').trim();
            if (!device.snmpCommunity) throw new Error('OLT SNMP community is required.');
            const nested = input.onuOids || {};
            const discoveryOid = optionalOid(input.discoveryOid || nested.discoveryOid, 'ONU discovery OID');
            if (!discoveryOid) throw new Error('ONU discovery OID is required for OLT inventory. Use the exact OID for the vendor/model/firmware.');
            const statusOid = optionalOid(input.statusOid || nested.statusOid, 'ONU status OID');
            const rxPowerOid = optionalOid(input.rxPowerOid || nested.rxPowerOid, 'RX power OID');
            const txPowerOid = optionalOid(input.txPowerOid || nested.txPowerOid, 'TX power OID');
            const rxPowerDivisor = positiveDivisor(input.rxPowerDivisor ?? nested.rxPowerDivisor, 'RX divisor');
            const txPowerDivisor = positiveDivisor(input.txPowerDivisor ?? nested.txPowerDivisor, 'TX divisor');
            device.onuOids = { discoveryOid };
            if (statusOid) device.onuOids.statusOid = statusOid;
            if (rxPowerOid) device.onuOids.rxPowerOid = rxPowerOid;
            if (txPowerOid) device.onuOids.txPowerOid = txPowerOid;
            if (rxPowerDivisor) device.onuOids.rxPowerDivisor = rxPowerDivisor;
            if (txPowerDivisor) device.onuOids.txPowerDivisor = txPowerDivisor;
        }
        return device;
    }
    function buildSecretPayload(device) {
        const input = { ...device, ...(device.onuOids || {}) };
        return JSON.stringify({ devices: [normalizeDeviceForm(input)] }, null, 2);
    }
    const api = { normalizeDeviceForm, buildSecretPayload };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.ISPDeviceConfig = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
