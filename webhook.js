const express = require('express');
const router = express.Router();

router.post('/xrocket', (req, res) => {
    console.log('📥 Webhook:', req.body);
    res.json({ ok: true });
});

router.get('/test', (req, res) => {
    res.json({ status: 'ok', url: 'https://sellflow.onrender.com/webhook/xrocket' });
});

module.exports = router;
