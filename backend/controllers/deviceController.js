const Device = require('../models/Device');

async function getDevices(req, res, next) {
  try {
    const devices = await Device.find().sort({ createdAt: -1 }).lean();
    res.json({ status: 'success', count: devices.length, data: devices });
  } catch (error) { next(error); }
}

async function addDevice(req, res, next) {
  try {
    const { deviceName, deviceType, deviceIP, devicePort, deviceUser, devicePass } = req.body;
    if (![deviceName, deviceType, deviceIP, devicePort, deviceUser, devicePass].every(v => v !== undefined && v !== null && String(v).trim() !== '')) {
      return res.status(400).json({ status: 'fail', message: 'All device fields are required.' });
    }
    const device = await Device.create({
      deviceName, deviceType, deviceIP, devicePort: Number(devicePort),
      deviceUser, devicePass, status: 'Connecting'
    });
    const safeDevice = device.toObject();
    delete safeDevice.devicePass;
    res.status(201).json({ status: 'success', message: 'Device saved. Live connectivity has not yet been verified.', data: safeDevice });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ status: 'fail', message: 'Device name already exists.' });
    next(error);
  }
}

async function deleteDevice(req, res, next) {
  try {
    const device = await Device.findByIdAndDelete(req.params.id);
    if (!device) return res.status(404).json({ status: 'fail', message: 'Device not found.' });
    res.json({ status: 'success', message: 'Device record deleted.' });
  } catch (error) { next(error); }
}

async function testConnection(req, res) {
  return res.status(501).json({
    status: 'not_implemented',
    message: 'Protocol-specific MikroTik/OLT connection drivers are required; this endpoint does not simulate a successful connection.'
  });
}

module.exports = { getDevices, addDevice, deleteDevice, testConnection };
