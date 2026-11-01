import { fetchStatusSnapshot } from './api.js';

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));
const dateLabel = value => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
};

function renderDevices(snapshot) {
  const tbody = document.getElementById('devices-table-rows');
  if (!tbody) return;
  const devices = Array.isArray(snapshot.devices) ? snapshot.devices : [];
  if (!devices.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">No scanned devices found. Configure ISP_DEVICES_JSON and run the scanner workflow.</td></tr>';
    return;
  }
  tbody.innerHTML = devices.map(d => {
    const online = d.status === 'online';
    return `<tr>
      <td class="fw-semibold">${escapeHtml(d.device || 'Unnamed device')}</td>
      <td>${escapeHtml(String(d.type || '—').toUpperCase())}</td>
      <td><code>${escapeHtml(d.host || '—')}</code></td>
      <td>${escapeHtml(d.port || (d.type === 'mikrotik' ? '8728' : '161'))}</td>
      <td><span class="badge ${online ? 'bg-success' : 'bg-danger'}">${online ? 'Online' : 'Offline'}</span>${d.error ? `<div class="small text-danger mt-1">${escapeHtml(d.error)}</div>` : ''}</td>
      <td class="small text-muted">${dateLabel(d.checkedAt)}</td>
      <td class="text-end"><span class="text-muted small">Snapshot</span></td>
    </tr>`;
  }).join('');
}

async function loadDevicesList() {
  const tbody = document.getElementById('devices-table-rows');
  try {
    const snapshot = await fetchStatusSnapshot({ force: true });
    renderDevices(snapshot);
  } catch (error) {
    console.warn('[Devices] Snapshot unavailable:', error);
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-center text-warning py-4">Device snapshot unavailable. Please retry after the GitHub Actions scanner publishes data.</td></tr>';
  }
}
loadDevicesList();
window.setInterval(loadDevicesList, 60000);
