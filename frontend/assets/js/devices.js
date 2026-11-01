import { fetchStatusSnapshot } from './api.js';
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateLabel = value => { if (!value) return '—'; const d = new Date(value); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString(); };

function renderDevices(snapshot) {
    const tbody = document.getElementById('devices-table-rows');
    if (!tbody) return;
    const devices = Array.isArray(snapshot.devices) ? snapshot.devices : [];
    if (!devices.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">No scanned devices found. Add configuration and run the GitHub Actions scanner.</td></tr>';
        return;
    }
    tbody.innerHTML = devices.map(device => {
        const online = device.status === 'online';
        const port = device.port || (device.type === 'mikrotik' ? 8728 : 161);
        return `<tr>
          <td class="fw-semibold">${escapeHtml(device.deviceName || 'Unnamed device')}</td>
          <td>${escapeHtml(device.type.toUpperCase())}</td>
          <td><code>${escapeHtml(device.host)}</code></td>
          <td>${escapeHtml(port)}</td>
          <td><span class="badge ${online ? 'bg-success' : device.status === 'unknown' ? 'bg-secondary' : 'bg-danger'}">${escapeHtml(device.status.toUpperCase())}</span>${device.error ? `<div class="small text-danger mt-1">${escapeHtml(device.error)}</div>` : ''}</td>
          <td class="small text-muted">${dateLabel(device.checkedAt)}</td>
          <td class="text-end"><span class="text-muted small">Read-only snapshot</span></td>
        </tr>`;
    }).join('');
}
async function loadDevicesList() {
    const tbody = document.getElementById('devices-table-rows');
    try { renderDevices(await fetchStatusSnapshot({ force: true })); }
    catch (error) {
        console.warn('[Devices] Snapshot unavailable:', error);
        if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center text-warning py-4">${escapeHtml(error.message || 'Device snapshot unavailable. Retry later.')}</td></tr>`;
    }
}
loadDevicesList();
window.setInterval(loadDevicesList, 60000);
