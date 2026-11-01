/**
 * GitHub Pages snapshot adapter — read-only by design.
 * Credentials and workflow write permissions must never enter browser code.
 */
const DEFAULT_STATUS_URL = 'https://raw.githubusercontent.com/uniquenetworkbd/ISP-Monitoring/main/data/devices-status.json';
const STATUS_URL = window.ISP_STATUS_JSON_URL || DEFAULT_STATUS_URL;
let cachedSnapshot = null;
let cachedAt = 0;
let inFlight = null;
const CACHE_TTL_MS = 15000;

function normalizeDevice(device, snapshotUpdatedAt) {
    if (!device || typeof device !== 'object' || Array.isArray(device)) {
        throw new Error('Snapshot contains an invalid device record.');
    }
    const type = String(device.type || device.deviceType || '').trim().toLowerCase();
    const name = String(device.deviceName || device.device || device.name || '').trim();
    const host = String(device.host || device.deviceIP || '').trim();
    if (!name || !host || !type) throw new Error('Snapshot device is missing name, type or host.');
    return {
        ...device,
        deviceId: String(device.deviceId || ''),
        deviceName: name,
        type,
        host,
        port: Number(device.port || device.devicePort || (type === 'mikrotik' ? 8728 : 161)),
        checkedAt: device.checkedAt || snapshotUpdatedAt || null,
        status: String(device.status || 'unknown').toLowerCase()
    };
}

function normalizeSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot) || !Array.isArray(snapshot.devices)) {
        throw new Error('The GitHub status JSON has an invalid snapshot structure.');
    }
    const updatedAt = snapshot.lastUpdated || null;
    const devices = snapshot.devices.map(device => normalizeDevice(device, updatedAt));
    const users = Array.isArray(snapshot.users) ? snapshot.users.map(user => ({
        ...user,
        username: String(user.username || user.user || user.callerId || '').trim(),
        address: String(user.address || user.ip || '').trim(),
        sourceDeviceTag: String(user.sourceDeviceTag || '—'),
        status: String(user.status || 'Unknown'),
        checkedAt: user.checkedAt || updatedAt
    })) : [];
    return { ...snapshot, devices, users };
}

export async function fetchStatusSnapshot({ force = false } = {}) {
    if (!force && cachedSnapshot && Date.now() - cachedAt < CACHE_TTL_MS) return cachedSnapshot;
    if (!force && inFlight) return inFlight;
    const separator = STATUS_URL.includes('?') ? '&' : '?';
    inFlight = fetch(`${STATUS_URL}${separator}_=${Date.now()}`, {
        cache: 'no-store', headers: { Accept: 'application/json' }
    }).then(async response => {
        if (!response.ok) throw new Error(`GitHub JSON request failed: HTTP ${response.status}`);
        const normalized = normalizeSnapshot(await response.json());
        cachedSnapshot = normalized;
        cachedAt = Date.now();
        return normalized;
    }).finally(() => { inFlight = null; });
    return inFlight;
}

export async function fetchDevices() { return (await fetchStatusSnapshot()).devices; }
export async function fetchScannedUsers() { return (await fetchStatusSnapshot()).users; }
export async function triggerScan() {
    throw new Error('Dashboard is read-only. Start the GitHub Actions scanner from the repository Actions page.');
}
export const triggerNetworkSync = triggerScan;
export const apiFetch = async () => { throw new Error('No browser-accessible backend API is configured in GitHub-only mode.'); };
export const apiRequest = apiFetch;
export const registerDevice = apiFetch;
export const testDeviceConnection = apiFetch;

window.api = { getDevices: fetchDevices, getUsers: fetchScannedUsers, triggerScan, getSnapshot: fetchStatusSnapshot };
Object.assign(window, { fetchStatusSnapshot, fetchDevices, fetchScannedUsers, triggerNetworkSync, triggerScan });

function initMobileNavigation() {
    const sidebar = document.getElementById('sidebarMenu') || document.getElementById('sidebar');
    if (!sidebar) return;
    sidebar.id = 'sidebarMenu';
    const toggle = document.getElementById('sidebarToggle');
    if (!toggle || toggle.dataset.navBound === 'true') return;
    const overlay = document.getElementById('sidebarOverlay');
    const close = () => {
        sidebar.classList.remove('active');
        overlay?.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
    };
    toggle.dataset.navBound = 'true';
    toggle.addEventListener('click', () => {
        const open = !sidebar.classList.contains('active');
        sidebar.classList.toggle('active', open);
        overlay?.classList.toggle('active', open);
        toggle.setAttribute('aria-expanded', String(open));
    });
    overlay?.addEventListener('click', close);
    sidebar.querySelectorAll('a').forEach(link => link.addEventListener('click', close));
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initMobileNavigation, { once: true });
else initMobileNavigation();
