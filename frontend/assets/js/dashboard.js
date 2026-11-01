import { fetchStatusSnapshot } from './api.js';

const byId = id => document.getElementById(id);
const formatDate = value => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
};
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

function renderSnapshot(snapshot) {
    const devices = Array.isArray(snapshot.devices) ? snapshot.devices : [];
    const users = Array.isArray(snapshot.users) ? snapshot.users : [];
    const online = Number.isFinite(Number(snapshot.onlineDevices))
        ? Number(snapshot.onlineDevices) : devices.filter(d => d.status === 'online').length;
    const offline = Number.isFinite(Number(snapshot.offlineDevices))
        ? Number(snapshot.offlineDevices) : devices.filter(d => d.status !== 'online').length;

    byId('metric-total-devices').textContent = snapshot.scannedDevices ?? devices.length;
    const mikrotikCount = devices.filter(device => device.type === 'mikrotik').length;
    const oltCount = devices.filter(device => device.type === 'olt').length;
    byId('metric-device-breakdown').textContent = `MikroTik: ${mikrotikCount} | OLT: ${oltCount}`;
    byId('metric-online-devices').textContent = online;
    byId('metric-active-users').textContent = snapshot.totalActiveUsers ?? users.length;
    byId('metric-offline-devices').textContent = `${offline} device(s) offline`;
    byId('snapshot-updated').textContent = `Last scan: ${formatDate(snapshot.lastUpdated)}`;

    const status = byId('snapshot-status');
    const snapshotState = String(snapshot.status || 'unknown').toLowerCase();
    status.textContent = `GitHub JSON: ${snapshotState.toUpperCase()}`;
    status.className = `badge p-2 ${snapshotState === 'success' ? 'bg-success' : snapshotState === 'partial' ? 'bg-warning text-dark' : 'bg-danger'}`;

    const rows = devices.map(device => {
        const isOnline = device.status === 'online';
        return `<tr>
            <td class="fw-semibold">${escapeHtml(device.device || 'Unnamed')}</td>
            <td>${escapeHtml(device.type || '—')}</td>
            <td><code>${escapeHtml(device.host || '—')}</code></td>
            <td><span class="badge ${isOnline ? 'bg-success' : 'bg-danger'}">${isOnline ? 'Online' : 'Offline'}</span>${device.error ? `<div class="small text-danger mt-1">${escapeHtml(device.error)}</div>` : ''}</td>
            <td class="small text-muted">${formatDate(device.checkedAt)}</td>
        </tr>`;
    }).join('');

    byId('device-status-rows').innerHTML = rows || '<tr><td colspan="5" class="text-muted text-center py-4">No device scan data is available yet. Configure devices and run the GitHub Actions scanner.</td></tr>';
}

function renderFallback(error) {
    const status = byId('snapshot-status');
    status.textContent = 'GitHub JSON: UNAVAILABLE';
    status.className = 'badge bg-warning text-dark p-2';
    byId('snapshot-updated').textContent = 'Snapshot could not be loaded';
    byId('device-status-rows').innerHTML = `<tr><td colspan="5" class="text-warning text-center py-4">${escapeHtml(error?.message || 'Status snapshot unavailable. Please retry.')}</td></tr>`;
}

async function loadDashboard() {
    try {
        const snapshot = await fetchStatusSnapshot({ force: true });
        renderSnapshot(snapshot);
    } catch (error) {
        console.warn('[ISP Dashboard] Snapshot load failed:', error);
        renderFallback(error);
    }
}

loadDashboard();
window.setInterval(loadDashboard, 60000);
