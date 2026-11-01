/**
 * ============================================================================
 * ISP MONITORING SYSTEM - FRONTEND API CLIENT SERVICE
 * Description: Handles HTTP requests from Bootstrap UI pages to Node.js backend
 * ============================================================================
 */

const API_BASE_URL = 'http://localhost:5000/api';

/**
 * Generic function to handle API fetch requests with error handling
 */
const apiRequest = async (endpoint, method = 'GET', data = null) => {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': \`Bearer \${localStorage.getItem('token') || ''}\`
            }
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(\`\${API_BASE_URL}\${endpoint}\`, options);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'API request failed');
        }

        return result;
    } catch (error) {
        console.error(\`❌ API Error [\${method} \${endpoint}]:\`, error.message);
        throw error;
    }
};

/**
 * Fetch all registered network devices (Mikrotik/OLT)
 */
const fetchDevices = async () => {
    return await apiRequest('/devices', 'GET');
};

/**
 * Register and add a new device to the cloud
 */
const registerDevice = async (deviceData) => {
    return await apiRequest('/devices', 'POST', deviceData);
};

/**
 * Test live connection to a device
 */
const testDeviceConnection = async (deviceData) => {
    return await apiRequest('/devices/test', 'POST', deviceData);
};

/**
 * Fetch all synchronized ISP client users
 */
const fetchScannedUsers = async () => {
    return await apiRequest('/users', 'GET');
};

/**
 * Trigger network scanner sync
 */
const triggerNetworkSync = async (payload) => {
    return await apiRequest('/users/sync', 'POST', payload);
};
