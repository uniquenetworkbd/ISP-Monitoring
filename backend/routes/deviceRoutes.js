const express = require('express');
const deviceController = require('../controllers/deviceController');

const router = express.Router();

router.get('/', deviceController.getDevices);
router.post('/add', deviceController.addDevice);
router.post('/test-connection', deviceController.testConnection);
router.post('/scan', deviceController.triggerScan);
router.delete('/:id', deviceController.deleteDevice);

module.exports = router;
