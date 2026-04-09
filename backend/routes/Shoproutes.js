// ============================================
// routes/shopRoutes.js
// GET  /api/shop/status  — public (frontend reads this)
// PUT  /api/shop/status  — admin only
// ============================================

const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const auth    = require('../middleware/authMiddleware');
const admin   = require('../middleware/adminMiddleware');

// ── GET /api/shop/status — public, no auth needed ──
router.get('/status', async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT value FROM settings WHERE `key` = 'shop_open' LIMIT 1"
    );
    const isOpen = rows.length === 0 || rows[0].value === '1';
    res.json({ success: true, shop_open: isOpen });
  } catch (err) {
    console.error('Shop status error:', err);
    res.json({ success: true, shop_open: true }); // fail open
  }
});

// ── PUT /api/shop/status — admin only ──
router.put('/status', auth, admin, async (req, res) => {
  try {
    const isOpen = req.body.shop_open ? '1' : '0';
    await db.query(
      "INSERT INTO settings (`key`, value) VALUES ('shop_open', ?) ON DUPLICATE KEY UPDATE value = ?",
      [isOpen, isOpen]
    );
    res.json({ success: true, shop_open: req.body.shop_open });
  } catch (err) {
    console.error('Shop toggle error:', err);
    res.status(500).json({ success: false, message: 'Failed to update shop status.' });
  }
});

module.exports = router;