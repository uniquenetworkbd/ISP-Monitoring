const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeRegistry, findDevice } = require('./deviceRegistry');

test('normalizes a registry and finds devices by canonical id', () => {
    const registry = normalizeRegistry([{ deviceId: 'CORE-R1', name: 'Core Router', type: 'mikrotik', host: '192.0.2.1' }]);
    assert.equal(registry[0].deviceId, 'core-r1');
    assert.equal(findDevice(registry, 'core-r1').host, '192.0.2.1');
    assert.equal(findDevice(registry, 'missing'), null);
});

test('rejects malformed registries and duplicate canonical ids', () => {
    assert.throws(() => normalizeRegistry({ devices: [] }), /must be an array/);
    assert.throws(() => normalizeRegistry([
        { deviceId: 'core-r1', name: 'Router A', type: 'mikrotik', host: '192.0.2.1' },
        { deviceId: 'CORE R1', name: 'Router B', type: 'mikrotik', host: '192.0.2.2' }
    ]), /Duplicate deviceId/);
});
