import { apiFetch } from './api.js';
export async function loadDevices() { return apiFetch('/devices'); }
export function renderDeviceStatus(device) { return device?.status || 'unknown'; }