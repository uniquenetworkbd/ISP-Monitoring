/**
 * Static GitHub Pages data adapter.
 * No backend API or external database is required by the dashboard.
 */
const DEFAULT_STATUS_URL =
    'https://raw.githubusercontent.com/uniquenetworkbd/ISP-Monitoring/main/data/devices-status.json';

const STATUS_URL = window.ISP_STATUS_JSON_URL || DEFAULT_STATUS_URL;
let cachedSnapshot = null;
let cachedAt = 0;
const CACHE_TTL_MS = 15000;

export async function fetchStatusSnapshot({ force = false } = {}) {
    if (!force && cachedSnapshot && Date.now() - cachedAt < CACHE_TTL_MS) {
        return cachedSnapshot;
    }
    const separator = STATUS_URL.includes('?') ? '&' : '?';
    const response = await fetch(`${STATUS_URL}${separator}_=${Date.now()}`, {
        cache: 'no-store',
        headers: { Accept: 'application/json' }
    });
    if (!response.ok) throw new Error(`GitHub JSON request failed: HTTP ${response.status}`);
    const snapshot = await response.json();
    if (!snapshot || !Array.isArray(snapshot.devices)) {
        throw new Error('The GitHub status JSON has an invalid schema.');
    }
    cachedSnapshot = snapshot;
    cachedAt = Date.now();
    return snapshot;
}

export async function fetchDevices() {
    const snapshot = await fetchStatusSnapshot();
    return snapshot.devices;
}

export async function fetchScannedUsers() {
    const snapshot = await fetchStatusSnapshot();
    return snapshot.users || [];
}

// Legacy write/API methods are intentionally disabled in this static read-only architecture.
export async function triggerScan() {
    throw new Error('Dashboard is read-only. Start the GitHub Actions workflow to run a new scan.');
}
export const triggerNetworkSync = triggerScan;
export const apiFetch = async () => { throw new Error('No backend API is configured in GitHub-only mode.'); };
export const apiRequest = apiFetch;
export const registerDevice = apiFetch;
export const testDeviceConnection = apiFetch;

const api = {
    getDevices: fetchDevices,
    getUsers: fetchScannedUsers,
    triggerScan,
    getSnapshot: fetchStatusSnapshot
};
window.api = api;
Object.assign(window, {
    fetchStatusSnapshot,
    fetchDevices,
    fetchScannedUsers,
    triggerNetworkSync,
    triggerScan
});

/* Shared responsive navigation for pages that use this adapter. */
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
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileNavigation, { once: true });
} else {
    initMobileNavigation();
}
