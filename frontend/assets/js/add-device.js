import './api.js';
const form = document.getElementById('cloudDeviceForm');
const typeSelect = document.getElementById('deviceType');
const mikrotikFields = document.getElementById('mikrotikFields');
const oltFields = document.getElementById('oltFields');
const portInput = document.getElementById('devicePort');
const feedback = document.getElementById('formFeedback');
const { normalizeDeviceForm, buildSecretPayload } = window.ISPDeviceConfig;
function updateTypeFields() {
    const type = typeSelect.value;
    mikrotikFields.hidden = type !== 'mikrotik';
    oltFields.hidden = type !== 'olt';
    portInput.value = type === 'mikrotik' ? '8728' : type === 'olt' ? '161' : '';
    document.getElementById('deviceUser').required = type === 'mikrotik';
    document.getElementById('devicePass').required = type === 'mikrotik';
    document.getElementById('snmpCommunity').required = type === 'olt';
    document.getElementById('discoveryOid').required = type === 'olt';
}
function getFormData() { return Object.fromEntries(new FormData(form).entries()); }
function showFeedback(message, kind = 'info') {
    feedback.className = 'alert alert-' + kind;
    feedback.textContent = message;
    feedback.hidden = false;
}
function validate() { return normalizeDeviceForm(getFormData()); }
typeSelect.addEventListener('change', updateTypeFields);
form.addEventListener('submit', event => {
    event.preventDefault();
    try {
        const device = validate();
        const payload = buildSecretPayload(device);
        const blob = new Blob([payload + '\n'], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'isp-devices-secret.json';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
        showFeedback('Configuration validated and downloaded. Add the JSON contents to GitHub → Settings → Secrets and variables → Actions as ISP_DEVICES_JSON, then run the scanner workflow. No network test or device registration was performed by this page.', 'success');
    } catch (error) { showFeedback(error.message, 'danger'); }
});
document.getElementById('validateConfig').addEventListener('click', () => {
    try {
        const device = validate();
        showFeedback('Configuration is valid for ' + device.deviceType.toUpperCase() + '. This checks fields and OID syntax only; it does not contact the device.', 'success');
    } catch (error) { showFeedback(error.message, 'danger'); }
});
updateTypeFields();
