export async function addDevice(payload) { return payload; }
export async function deleteDevice(id) { return { id, deleted: true }; }
export async function updateDevice(id, payload) { return { id, ...payload }; }