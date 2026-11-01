const express = require('express');
const { getDevices, addDevice, deleteDevice, testConnection } = require('../controllers/deviceController');

const router = express.Router();
router.route('/').get(getDevices).post(addDevice);
router.post('/test', testConnection);
router.delete('/:id', deleteDevice);

module.exports = router;
