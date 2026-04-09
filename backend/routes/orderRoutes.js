// ============================================
// routes/orderRoutes.js
// POST /api/orders           — place new order
// GET  /api/orders/mine      — get logged in user's orders
// GET  /api/orders/:id       — get single order
// GET  /api/orders/check-pincode/:pin — check delivery availability
// ============================================

const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const auth    = require('../middleware/authMiddleware');

// ── CHECK PINCODE availability ──
// Public route — no login needed
router.get('/check-pincode/:pin', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM serviceable_pincodes WHERE pincode = ? AND is_active = 1',
      [req.params.pin]
    );
    if (rows.length > 0) {
      res.json({ success: true, deliverable: true, area: rows[0].area_name });
    } else {
      res.json({ success: true, deliverable: false });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── VALIDATE COUPON ──
router.post('/validate-coupon', auth, async (req, res) => {
  try {
    const { code, subtotal } = req.body;
    const [rows] = await db.query(
      `SELECT * FROM coupons
       WHERE code = ? AND is_active = 1
       AND (expiry_date IS NULL OR expiry_date >= CURDATE())
       AND used_count < max_uses`,
      [code]
    );
    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired coupon.' });
    }
    const coupon = rows[0];
    if (subtotal < coupon.min_order) {
      return res.status(400).json({
        success: false,
        message: `Minimum order ₹${coupon.min_order} required for this coupon.`
      });
    }
    const discount = coupon.type === 'percent'
      ? Math.round((subtotal * coupon.discount) / 100)
      : coupon.discount;

    res.json({ success: true, coupon, discount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PLACE ORDER ──
router.post('/', auth, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const {
      items,           // [{ product_id, name, price, qty, image_url }]
      subtotal,
      delivery_fee,
      tax,
      total,
      payment_method,
      delivery_address,
      notes,
      coupon_code
    } = req.body;

    // Validate required fields
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No items in order.' });
    }
    if (!delivery_address) {
      return res.status(400).json({ success: false, message: 'Delivery address required.' });
    }
    if (!payment_method) {
      return res.status(400).json({ success: false, message: 'Payment method required.' });
    }

    // Generate unique order number
    const orderNumber = 'ORD' + Date.now();

    // Insert order into orders table
    const [orderResult] = await conn.query(
      `INSERT INTO orders
       (user_id, order_number, subtotal, delivery_fee, tax, total,
        payment_method, payment_status, delivery_address, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        orderNumber,
        subtotal,
        delivery_fee || 49,
        tax || 0,
        total,
        payment_method,
        payment_method === 'cod' ? 'pending' : 'paid',
        delivery_address,
        notes || null
      ]
    );

    const orderId = orderResult.insertId;

    // Insert each item into order_items table
    for (const item of items) {
      await conn.query(
        `INSERT INTO order_items
         (order_id, product_id, name, price, qty, image_url)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, item.product_id, item.name, item.price, item.qty, item.image_url || null]
      );
    }

    // If coupon used, increment used_count
    if (coupon_code) {
      await conn.query(
        'UPDATE coupons SET used_count = used_count + 1 WHERE code = ?',
        [coupon_code]
      );
    }

    await conn.commit();

    // Return the created order
    const [orderRows] = await db.query(
      'SELECT * FROM orders WHERE id = ?', [orderId]
    );
    const [itemRows] = await db.query(
      'SELECT * FROM order_items WHERE order_id = ?', [orderId]
    );

    res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      order: { ...orderRows[0], items: itemRows }
    });

  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

// ── GET my orders (logged in user) ──
router.get('/mine', auth, async (req, res) => {
  try {
    const [orders] = await db.query(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );

    // Attach items to each order
    for (const order of orders) {
      const [items] = await db.query(
        'SELECT * FROM order_items WHERE order_id = ?',
        [order.id]
      );
      order.items = items;
    }

    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET single order by id ──
router.get('/:id', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    const [items] = await db.query(
      'SELECT * FROM order_items WHERE order_id = ?',
      [rows[0].id]
    );
    res.json({ success: true, order: { ...rows[0], items } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
