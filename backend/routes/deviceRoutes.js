export function listDevices() { return { method: 'GET', path: '/api/devices' }; }
export function createDevice() { return { method: 'POST', path: '/api/devices' }; }
export function updateDevice() { return { method: 'PATCH', path: '/api/devices/:id' }; }