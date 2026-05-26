const express = require('express');
const router = express.Router();
const healthController = require('./health.controller');

router.get('/', healthController.status);

module.exports = router;
