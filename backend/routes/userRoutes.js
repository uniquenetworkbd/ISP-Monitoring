const express = require('express');
const { getUsers, syncUsers } = require('../controllers/userController');

const router = express.Router();
router.get('/', getUsers);
router.post('/sync', syncUsers);

module.exports = router;
