const API_BASE_URL = (window.API_BASE_URL || (
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : '/api'
)).replace(/\/$/, '');

export const apiFetch = async (endpoint, options = {}) => {
  const method = options.method || 'GET';
  const headers = {
    'Content-Type': 'application/json',
    ...(localStorage.getItem('token') ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}),
    ...(options.headers || {})
  };
  const config = { ...options, method, headers };
  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }
  const response = await fetch(`${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`, config);
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) throw new Error((data && data.message) || `HTTP ${response.status}`);
  return data;
};

export const apiRequest = (endpoint, method = 'GET', data = null) =>
  apiFetch(endpoint, { method, ...(data === null ? {} : { body: data }) });
export const fetchDevices = () => apiFetch('/devices');
export const registerDevice = deviceData => apiFetch('/devices', { method: 'POST', body: deviceData });
export const testDeviceConnection = deviceData => apiFetch('/devices/test', { method: 'POST', body: deviceData });
export const fetchScannedUsers = () => apiFetch('/users');
export const triggerNetworkSync = payload => apiFetch('/users/sync', { method: 'POST', body: payload });

/* Shared responsive navigation for every frontend page that loads api.js. */
const initMobileNavigation = () => {
  const sidebar = document.getElementById('sidebarMenu') || document.getElementById('sidebar');
  if (!sidebar) return;
  sidebar.id = 'sidebarMenu';

  let toggleBtn = document.getElementById('sidebarToggle');
  let mobileHeader = document.querySelector('.mobile-header');

  if (!mobileHeader) {
    mobileHeader = document.createElement('div');
    mobileHeader.className = 'mobile-header';
    mobileHeader.innerHTML = `
      <h5 class="m-0 text-info fw-bold"><i class="fas fa-network-wired me-2"></i>ISP Cloud</h5>
      <button class="btn btn-dark text-white border-0" id="sidebarToggle" type="button"
              aria-label="Toggle navigation" aria-expanded="false" aria-controls="sidebarMenu">
        <i class="fas fa-bars fa-lg"></i>
      </button>`;
    document.body.prepend(mobileHeader);
    toggleBtn = mobileHeader.querySelector('#sidebarToggle');
  }

  let overlay = document.getElementById('sidebarOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'sidebarOverlay';
    overlay.className = 'mobile-sidebar-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(overlay, sidebar);
  }

  if (!toggleBtn || toggleBtn.dataset.navBound === 'true') return;
  toggleBtn.dataset.navBound = 'true';

  const closeSidebar = () => {
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    toggleBtn.setAttribute('aria-expanded', 'false');
  };

  const openSidebar = () => {
    sidebar.classList.add('active');
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    toggleBtn.setAttribute('aria-expanded', 'true');
  };

  toggleBtn.addEventListener('click', event => {
    event.stopPropagation();
    sidebar.classList.contains('active') ? closeSidebar() : openSidebar();
  });
  overlay.addEventListener('click', closeSidebar);
  document.addEventListener('click', event => {
    if (!sidebar.contains(event.target) && !toggleBtn.contains(event.target)) closeSidebar();
  });
  sidebar.querySelectorAll('a').forEach(link => link.addEventListener('click', closeSidebar));
  window.addEventListener('resize', () => {
    if (window.innerWidth > 992) closeSidebar();
  });
};

if (typeof window !== 'undefined') {
  Object.assign(window, { apiFetch, apiRequest, fetchDevices, registerDevice, testDeviceConnection, fetchScannedUsers, triggerNetworkSync });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileNavigation, { once: true });
  } else {
    initMobileNavigation();
  }
}
