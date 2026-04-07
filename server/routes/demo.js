// Demo mode status endpoint for CreatorSync
const express = require('express');
const router = express.Router();
const demoMode = require('../utils/demoMode');

router.get('/demo-mode-status', (req, res) => {
    res.json({ demoMode: demoMode.isDemoMode() });
});

module.exports = router;
