// ============================================
// routes/couponRoutes.js
// POST /api/coupons/validate — validate coupon
// ============================================

const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const auth    = require('../middleware/authMiddleware');

// ── VALIDATE COUPON (used at checkout) ──
router.post('/validate', auth, async (req, res) => {
  try {
    const { code, subtotal } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Coupon code required.' });

    const [rows] = await db.query(
      `SELECT * FROM coupons
       WHERE code = ? AND is_active = 1
       AND (expiry_date IS NULL OR expiry_date >= CURDATE())
       AND used_count < max_uses`,
      [code.toUpperCase()]
    );

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired coupon.' });
    }

    const coupon = rows[0];
    if (subtotal < coupon.min_order) {
      return res.status(400).json({
        success: false,
        message: `Minimum order of ₹${coupon.min_order} required for this coupon.`
      });
    }

    const discount = coupon.type === 'percent'
      ? Math.round((subtotal * coupon.discount) / 100)
      : coupon.discount;

    res.json({
      success: true,
      message: `Coupon applied! You save ₹${discount}`,
      discount,
      coupon: { code: coupon.code, type: coupon.type, discount: coupon.discount }
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
