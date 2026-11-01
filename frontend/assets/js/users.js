import { fetchStatusSnapshot } from './api.js';

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));
const dateLabel = value => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
};

let allUsers = [];
function renderUsers(users) {
  const tbody = document.getElementById('users-table-rows');
  if (!tbody) return;
  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No PPPoE users found in the latest scan snapshot.</td></tr>';
    return;
  }
  tbody.innerHTML = users.map(user => {
    const active = String(user.status || '').toLowerCase() === 'active';
    return `<tr>
      <td class="fw-semibold">${escapeHtml(user.username || '—')}</td>
      <td><code>${escapeHtml(user.address || '—')}</code></td>
      <td class="text-muted small">Not collected by current scanner</td>
      <td><span class="badge bg-primary bg-opacity-10 text-primary border">${escapeHtml(user.sourceDeviceTag || '—')}</span></td>
      <td><span class="badge ${active ? 'bg-success' : 'bg-secondary'}">${escapeHtml(user.status || 'Unknown')}</span></td>
      <td class="small text-muted">${dateLabel(user.checkedAt)}</td>
    </tr>`;
  }).join('');
}
function applySearch() {
  const query = (document.getElementById('user-search')?.value || '').trim().toLowerCase();
  renderUsers(allUsers.filter(user =>
    [user.username, user.address, user.sourceDeviceTag, user.status]
      .some(value => String(value || '').toLowerCase().includes(query))
  ));
}
async function loadUsers() {
  const tbody = document.getElementById('users-table-rows');
  try {
    const snapshot = await fetchStatusSnapshot({ force: true });
    allUsers = Array.isArray(snapshot.users) ? snapshot.users : [];
    applySearch();
  } catch (error) {
    console.warn('[Users] Snapshot unavailable:', error);
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="text-center text-warning py-4">User snapshot unavailable. Please retry after the GitHub Actions scanner publishes data.</td></tr>';
  }
}
document.getElementById('user-search')?.addEventListener('input', applySearch);
loadUsers();
window.setInterval(loadUsers, 60000);
