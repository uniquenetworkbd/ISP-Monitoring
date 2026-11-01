const test = require('node:test');
const assert = require('node:assert/strict');
const { buildBandwidth, calculateRate } = require('./bandwidthEngine');
test('calculates RX/TX bit rates from two samples', () => {
 const old=[{deviceId:'r1',checkedAt:'2026-11-01T10:00:00Z',interfaces:[{id:'*1',name:'ether1',rxBytes:1000,txBytes:2000}]}];
 const now=[{deviceId:'r1',deviceName:'Core',checkedAt:'2026-11-01T10:00:10Z',interfaces:[{id:'*1',name:'ether1',rxBytes:2000,txBytes:4000}]}];
 const rate=buildBandwidth(now,old)[0].interfaces[0];
 assert.equal(rate.rxBitsPerSecond,800); assert.equal(rate.txBitsPerSecond,1600); assert.equal(rate.rateStatus,'calculated');
});
test('does not fabricate first, reset, missing or stale rates', () => {
 assert.equal(calculateRate(4,5,1000,900000),null);
 const old=[{deviceId:'r',checkedAt:'2026-11-01T10:00:00Z',interfaces:[{name:'e1',rxBytes:500,txBytes:500}]}];
 const reset=buildBandwidth([{deviceId:'r',checkedAt:'2026-11-01T10:00:10Z',interfaces:[{name:'e1',rxBytes:2,txBytes:2}]}],old)[0].interfaces[0];
 assert.equal(reset.rxBitsPerSecond,null); assert.equal(reset.rateStatus,'counter_reset');
 const stale=buildBandwidth([{deviceId:'r',checkedAt:'2026-11-01T11:00:00Z',interfaces:[{name:'e1',rxBytes:900,txBytes:900}]}],old)[0].interfaces[0];
 assert.equal(stale.rxBitsPerSecond,null); assert.equal(stale.rateStatus,'stale_sample');
});
test('rejects malformed collections',()=>assert.throws(()=>buildBandwidth({},[]),/arrays/));