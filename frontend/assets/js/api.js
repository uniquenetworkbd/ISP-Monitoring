/**
 * ============================================================================
 * ISP MONITORING SYSTEM - FRONTEND API BRIDGE
 * ============================================================================
 *
 * Configure window.ISP_API_BASE_URL before loading this module in production,
 * e.g. https://your-api-host.example.com/api
 */

const configuredApiUrl = window.ISP_API_BASE_URL;
const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const API_BASE_URL = String(
    configuredApiUrl || (isLocalHost ? 'http://localhost:5000/api' : '')
).replace(/\/$/, '');

class ApiService {
    constructor(baseUrl = API_BASE_URL) {
        this.baseUrl = baseUrl;
    }

    getBaseUrl() {
        if (!this.baseUrl) {
            throw new Error('Backend API URL is not configured. Set window.ISP_API_BASE_URL before loading api.js.');
        }
        return this.baseUrl;
    }

    async request(endpoint, options = {}) {
        const token = window.localStorage ? localStorage.getItem('token') : null;
        const headers = {
            Accept: 'application/json',
            ...(options.body ? { 'Content-Type': 'application/json' } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {})
        };

        const response = await fetch(`${this.getBaseUrl()}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`, {
            ...options,
            headers
        });

        const contentType = response.headers.get('content-type') || '';
        const payload = contentType.includes('application/json')
            ? await response.json()
            : await response.text();

        if (!response.ok) {
            const message = payload && typeof payload === 'object'
                ? payload.error || payload.message
                : payload;
            throw new Error(message || `HTTP ${response.status}`);
        }
        return payload;
    }

    async getDevices() {
        const result = await this.request('/devices');
        return result && result.success ? result.data : [];
    }

    async addDevice(deviceData) {
        return this.request('/devices/add', {
            method: 'POST',
            body: JSON.stringify(deviceData)
        });
    }

    async testConnection(deviceData) {
        return this.request('/devices/test-connection', {
            method: 'POST',
            body: JSON.stringify(deviceData)
        });
    }

    async triggerScan() {
        return this.request('/devices/scan', { method: 'POST' });
    }

    async getUsers() {
        return this.request('/users');
    }
}

const api = new ApiService();

export const apiFetch = (endpoint, options = {}) => api.request(endpoint, options);
export const apiRequest = (endpoint, method = 'GET', data = null) => api.request(endpoint, {
    method,
    ...(data === null ? {} : { body: JSON.stringify(data) })
});
export const fetchDevices = () => api.getDevices();
export const registerDevice = deviceData => api.addDevice(deviceData);
export const testDeviceConnection = deviceData => api.testConnection(deviceData);
export const fetchScannedUsers = () => api.getUsers();
export const triggerNetworkSync = () => api.triggerScan();
export const triggerScan = () => api.triggerScan();

window.api = api;
Object.assign(window, {
    apiFetch,
    apiRequest,
    fetchDevices,
    registerDevice,
    testDeviceConnection,
    fetchScannedUsers,
    triggerNetworkSync,
    triggerScan
});

/* Shared responsive navigation for all pages importing this module. */
function initMobileNavigation() {
    const sidebar = document.getElementById('sidebarMenu') || document.getElementById('sidebar');
    if (!sidebar) return;
    sidebar.id = 'sidebarMenu';

    let header = document.querySelector('.mobile-header');
    if (!header) {
        header = document.createElement('header');
        header.className = 'mobile-header';
        header.innerHTML = `
            <span class="mobile-brand">ISP Cloud Monitoring</span>
            <button class="btn btn-dark text-white border-0" id="sidebarToggle"
                    type="button" aria-label="Toggle navigation"
                    aria-expanded="false" aria-controls="sidebarMenu">
                <i class="fas fa-bars fa-lg" aria-hidden="true"></i>
            </button>`;
        document.body.prepend(header);
    }

    const toggle = header.querySelector('#sidebarToggle') || document.getElementById('sidebarToggle');
    if (!toggle || toggle.dataset.navBound === 'true') return;

    let overlay = document.getElementById('sidebarOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'sidebarOverlay';
        overlay.className = 'mobile-sidebar-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        document.body.appendChild(overlay);
    }

    const close = () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        overlay.setAttribute('aria-hidden', 'true');
        toggle.setAttribute('aria-expanded', 'false');
    };
    const open = () => {
        sidebar.classList.add('active');
        overlay.classList.add('active');
        overlay.setAttribute('aria-hidden', 'false');
        toggle.setAttribute('aria-expanded', 'true');
    };

    toggle.dataset.navBound = 'true';
    toggle.addEventListener('click', event => {
        event.stopPropagation();
        sidebar.classList.contains('active') ? close() : open();
    });
    overlay.addEventListener('click', close);
    document.addEventListener('click', event => {
        if (!sidebar.contains(event.target) && !toggle.contains(event.target)) close();
    });
    sidebar.querySelectorAll('a').forEach(link => link.addEventListener('click', close));
    window.addEventListener('resize', () => {
        if (window.innerWidth > 992) close();
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileNavigation, { once: true });
} else {
    initMobileNavigation();
}
