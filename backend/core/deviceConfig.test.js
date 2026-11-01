const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').resolve(__dirname, '../../frontend/assets/js/device-config-core.js'), 'utf8');
const browserGlobal = {};
vm.runInNewContext(source, { globalThis: browserGlobal });
const { normalizeDeviceForm, buildSecretPayload } = browserGlobal.ISPDeviceConfig;

test('normalizes MikroTik form and applies API port default', () => {
    const result = normalizeDeviceForm({ deviceType: 'mikrotik', deviceName: 'Core Router', deviceIP: 'router.example.net', deviceUser: 'monitor', devicePass: 'secret', deviceVendor: 'MikroTik', parentDeviceId: 'pop-switch-1' });
    assert.equal(result.devicePort, 8728);
    assert.equal(result.deviceUser, 'monitor');
    assert.equal(result.devicePass, 'secret');
    assert.equal(result.vendor, 'MikroTik');
    assert.equal(result.parentDeviceId, 'pop-switch-1');
});
test('normalizes OLT form with explicit vendor OID profile and divisors', () => {
    const result = normalizeDeviceForm({ deviceType: 'olt', deviceName: 'POP OLT', deviceIP: '192.0.2.10', devicePort: '1161', snmpCommunity: 'private', deviceVendor: 'Vendor X', deviceModel: 'Model Y', discoveryOid: '1.3.6.1.4.1.999.1', statusOid: '1.3.6.1.4.1.999.2', rxPowerOid: '1.3.6.1.4.1.999.3', txPowerOid: '1.3.6.1.4.1.999.4', rxPowerDivisor: '100', txPowerDivisor: '10' });
    assert.equal(result.snmpPort, 1161);
    assert.equal(result.snmpCommunity, 'private');
    assert.deepEqual(JSON.parse(JSON.stringify(result.onuOids)), { discoveryOid: '1.3.6.1.4.1.999.1', statusOid: '1.3.6.1.4.1.999.2', rxPowerOid: '1.3.6.1.4.1.999.3', txPowerOid: '1.3.6.1.4.1.999.4', rxPowerDivisor: 100, txPowerDivisor: 10 });
});
test('rejects unsupported types, invalid host, port and missing credentials', () => {
    assert.throws(() => normalizeDeviceForm({ deviceType: 'switch', deviceName: 'Switch', deviceIP: '192.0.2.1' }), /Only MikroTik and OLT/);
    assert.throws(() => normalizeDeviceForm({ deviceType: 'mikrotik', deviceName: 'Router', deviceIP: 'bad host', deviceUser: 'u', devicePass: 'p' }), /valid hostname/);
    assert.throws(() => normalizeDeviceForm({ deviceType: 'mikrotik', deviceName: 'Router', deviceIP: '192.999.1.1', deviceUser: 'u', devicePass: 'p' }), /valid hostname/);
    assert.throws(() => normalizeDeviceForm({ deviceType: 'mikrotik', deviceName: 'Router', deviceIP: 'node.-invalid.example', deviceUser: 'u', devicePass: 'p' }), /valid hostname/);
    assert.throws(() => normalizeDeviceForm({ deviceType: 'olt', deviceName: 'OLT', deviceIP: '192.0.2.1', devicePort: 70000, snmpCommunity: 'x', discoveryOid: '1.3.6.1' }), /Port must/);
    assert.throws(() => normalizeDeviceForm({ deviceType: 'mikrotik', deviceName: 'Router', deviceIP: '192.0.2.1', deviceUser: 'u' }), /username and password/);
    assert.throws(() => normalizeDeviceForm({ deviceType: 'olt', deviceName: 'OLT', deviceIP: '192.0.2.1' }), /SNMP community/);
});
test('requires exact OLT discovery OID and rejects malformed OIDs or divisors', () => {
    const base = { deviceType: 'olt', deviceName: 'OLT', deviceIP: '192.0.2.1', snmpCommunity: 'private' };
    assert.throws(() => normalizeDeviceForm(base), /discovery OID is required/);
    assert.throws(() => normalizeDeviceForm({ ...base, discoveryOid: '1.3.bad' }), /numeric dotted OID/);
    assert.throws(() => normalizeDeviceForm({ ...base, discoveryOid: '1.3.6', rxPowerDivisor: '0' }), /positive number/);
    assert.throws(() => normalizeDeviceForm({ ...base, discoveryOid: '1.3.6', parentDeviceId: '../bad' }), /Parent device ID/);
});
test('secret payload contains one normalized device and is JSON parseable', () => {
    const json = buildSecretPayload({ deviceType: 'mikrotik', deviceName: 'Core', deviceIP: '192.0.2.1', deviceUser: 'monitor', devicePass: 'secret' });
    const parsed = JSON.parse(json);
    assert.equal(parsed.devices.length, 1);
    assert.equal(parsed.devices[0].deviceType, 'mikrotik');
});
