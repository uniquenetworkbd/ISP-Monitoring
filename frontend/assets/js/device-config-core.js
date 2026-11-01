/* Shared device form validation and GitHub secret payload builder. No persistence. */
(function (root) {
    'use strict';
    const SUPPORTED = new Set(['mikrotik', 'olt']);
    function isValidHost(host) {
        if (!host || host.length > 253 || host.includes('://') || /\s/.test(host)) return false;
        if (/^\d+(?:\.\d+){3}$/.test(host)) return host.split('.').every(part => Number(part) >= 0 && Number(part) <= 255 && String(Number(part)) === part);
        return host.split('.').every(label => label.length >= 1 && label.length <= 63 && /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(label));
    }
    function normalizeDeviceForm(input) {
        const type = String(input.deviceType || '').trim().toLowerCase();
        const name = String(input.deviceName || '').trim();
        const host = String(input.deviceIP || '').trim();
        if (!SUPPORTED.has(type)) throw new Error('Only MikroTik and OLT are currently supported by the scanner.');
        if (name.length < 2 || name.length > 80) throw new Error('Device name must be 2–80 characters.');
        if (!isValidHost(host)) throw new Error('Enter a valid hostname or IPv4 address.');
        const port = Number(input.devicePort || (type === 'mikrotik' ? 8728 : 161));
        if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Port must be an integer from 1 to 65535.');
        const device = { deviceName: name, deviceType: type, deviceIP: host, devicePort: port };
        if (type === 'mikrotik') {
            device.deviceUser = String(input.deviceUser || '').trim();
            device.devicePass = String(input.devicePass || '');
            if (!device.deviceUser || !device.devicePass) throw new Error('MikroTik username and password are required.');
        } else {
            device.snmpPort = port;
            device.snmpCommunity = String(input.snmpCommunity || '').trim();
            if (!device.snmpCommunity) throw new Error('OLT SNMP community is required.');
        }
        return device;
    }
    function buildSecretPayload(device) { return JSON.stringify({ devices: [normalizeDeviceForm(device)] }, null, 2); }
    const api = { normalizeDeviceForm, buildSecretPayload };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.ISPDeviceConfig = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
