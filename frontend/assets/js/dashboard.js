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
    byId('metric-total-devices').textContent = snapshot.scannedDevices ?? snapshot.devices.length;
    const mikrotikCount = snapshot.devices.filter(device => device.type === 'mikrotik').length;
    const oltCount = snapshot.devices.filter(device => device.type === 'olt').length;
    byId('metric-device-breakdown').textContent = `MikroTik: ${mikrotikCount} | OLT: ${oltCount}`;
    byId('metric-online-devices').textContent = snapshot.onlineDevices ?? snapshot.devices.filter(d => d.status === 'online').length;
    byId('metric-active-users').textContent = snapshot.totalActiveUsers ?? (snapshot.users || []).length;
    byId('metric-offline-devices').textContent = `${snapshot.offlineDevices ?? snapshot.devices.filter(d => d.status !== 'online').length} device(s) offline`;
    byId('snapshot-updated').textContent = `Last scan: ${formatDate(snapshot.lastUpdated)}`;

    const status = byId('snapshot-status');
    status.textContent = `GitHub JSON: ${String(snapshot.status || 'unknown').toUpperCase()}`;
    status.className = `badge p-2 ${snapshot.status === 'success' ? 'bg-success' : snapshot.status === 'partial' ? 'bg-warning text-dark' : 'bg-danger'}`;

    const rows = snapshot.devices.map(device => {
        const online = device.status === 'online';
        return `<tr>
            <td class="fw-semibold">${escapeHtml(device.device || 'Unnamed')}</td>
            <td>${escapeHtml(device.type || '—')}</td>
            <td><code>${escapeHtml(device.host || '—')}</code></td>
            <td><span class="badge ${online ? 'bg-success' : 'bg-danger'}">${online ? 'Online' : 'Offline'}</span>${device.error ? `<div class="small text-danger mt-1">${escapeHtml(device.error)}</div>` : ''}</td>
            <td class="small text-muted">${formatDate(device.checkedAt)}</td>
        </tr>`;
    }).join('');
    byId('device-status-rows').innerHTML = rows || '<tr><td colspan="5" class="text-muted text-center">No scan data yet. Run the GitHub Actions workflow.</td></tr>';
}

async function loadDashboard() {
    const status = byId('snapshot-status');
    try {
        const snapshot = await fetchStatusSnapshot({ force: true });
        renderSnapshot(snapshot);
    } catch (error) {
        status.textContent = 'GitHub JSON: ERROR';
        status.className = 'badge bg-danger p-2';
        byId('device-status-rows').innerHTML = `<tr><td colspan="5" class="text-danger text-center">${escapeHtml(error.message)}</td></tr>`;
    }
}
loadDashboard();
// Refresh the published snapshot periodically; hardware polling remains an Actions job.
window.setInterval(loadDashboard, 60000);
