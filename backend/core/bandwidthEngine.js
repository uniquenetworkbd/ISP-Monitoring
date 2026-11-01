function counter(value) {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isSafeInteger(n) && n >= 0 ? n : null;
}
function previousIndex(devices) {
    const map = new Map();
    for (const device of devices || []) for (const item of device.interfaces || []) {
        const key = item.id ? 'id:' + item.id : item.name ? 'name:' + item.name : null;
        if (key) map.set(device.deviceId + ':' + key, { ...item, checkedAt: device.checkedAt });
    }
    return map;
}
function calculateRate(current, previous, elapsedMs, maxGapMs) {
    const a = counter(current), b = counter(previous);
    if (a === null || b === null || !Number.isFinite(elapsedMs) || elapsedMs <= 0 || elapsedMs > maxGapMs || a < b) return null;
    return Number((((a - b) * 8000) / elapsedMs).toFixed(2));
}
function buildBandwidth(devices, previousDevices = [], options = {}) {
    if (!Array.isArray(devices) || !Array.isArray(previousDevices)) throw new Error('Bandwidth input devices must be arrays');
    const maxGapMs = Number(options.maxGapMs) > 0 ? Number(options.maxGapMs) : 900000;
    const old = previousIndex(previousDevices);
    return devices.map(device => ({
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        interfaces: (device.interfaces || []).map(item => {
            const key = item.id ? 'id:' + item.id : item.name ? 'name:' + item.name : null;
            const prior = key ? old.get(device.deviceId + ':' + key) : null;
            const elapsed = prior ? Date.parse(device.checkedAt) - Date.parse(prior.checkedAt) : NaN;
            const rxReset = prior && counter(item.rxBytes) !== null && counter(prior.rxBytes) !== null && counter(item.rxBytes) < counter(prior.rxBytes);
            const txReset = prior && counter(item.txBytes) !== null && counter(prior.txBytes) !== null && counter(item.txBytes) < counter(prior.txBytes);
            const validWindow = Number.isFinite(elapsed) && elapsed > 0 && elapsed <= maxGapMs;
            return {
                id: item.id || null, name: item.name || 'unknown',
                rxBytes: counter(item.rxBytes), txBytes: counter(item.txBytes),
                rxBitsPerSecond: calculateRate(item.rxBytes, prior?.rxBytes, elapsed, maxGapMs),
                txBitsPerSecond: calculateRate(item.txBytes, prior?.txBytes, elapsed, maxGapMs),
                sampleIntervalMs: validWindow ? elapsed : null,
                rateStatus: !prior ? 'baseline' : !validWindow ? 'stale_sample' :
                    counter(item.rxBytes) === null || counter(item.txBytes) === null ? 'counter_unavailable' :
                    rxReset || txReset ? 'counter_reset' : 'calculated'
            };
        })
    }));
}
module.exports = { buildBandwidth, calculateRate };