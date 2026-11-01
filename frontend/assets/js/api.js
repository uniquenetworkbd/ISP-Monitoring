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

if (typeof window !== 'undefined') {
  Object.assign(window, { apiFetch, apiRequest, fetchDevices, registerDevice, testDeviceConnection, fetchScannedUsers, triggerNetworkSync });
}
