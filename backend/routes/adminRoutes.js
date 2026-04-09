// ============================================
// routes/adminRoutes.js
// All routes require admin role
// GET  /api/admin/dashboard   — stats
// GET  /api/admin/orders      — all orders
// PUT  /api/admin/orders/:id  — update order status
// GET  /api/admin/products    — all products
// POST /api/admin/products    — add product
// PUT  /api/admin/products/:id— edit product
// DELETE /api/admin/products/:id — delete product
// GET  /api/admin/users       — all customers
// GET  /api/admin/pincodes    — serviceable pincodes
// POST /api/admin/pincodes    — add pincode
// DELETE /api/admin/pincodes/:id— remove pincode
// ============================================

const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const auth    = require('../middleware/authMiddleware');
const admin   = require('../middleware/adminMiddleware');

// All admin routes require login + admin role
router.use(auth, admin);

// ── DASHBOARD STATS ──
router.get('/dashboard', async (req, res) => {
  try {
    const [[{ totalOrders }]]   = await db.query('SELECT COUNT(*) AS totalOrders FROM orders');
    const [[{ totalRevenue }]]  = await db.query("SELECT COALESCE(SUM(total),0) AS totalRevenue FROM orders WHERE status != 'cancelled'");
    const [[{ totalCustomers }]]= await db.query("SELECT COUNT(*) AS totalCustomers FROM users WHERE role = 'customer'");
    const [[{ totalProducts }]] = await db.query('SELECT COUNT(*) AS totalProducts FROM products');

    // Orders by status
    const [statusCounts] = await db.query(
      'SELECT status, COUNT(*) AS count FROM orders GROUP BY status'
    );

    // Recent 5 orders
    const [recentOrders] = await db.query(
      `SELECT o.*, u.name AS customer_name
       FROM orders o JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC LIMIT 5`
    );

    res.json({
      success: true,
      stats: { totalOrders, totalRevenue, totalCustomers, totalProducts },
      statusCounts,
      recentOrders
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET ALL ORDERS ──
router.get('/orders', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `SELECT o.*, u.name AS customer_name, u.email AS customer_email
                 FROM orders o JOIN users u ON o.user_id = u.id`;
    const params = [];

    if (status) {
      query += ' WHERE o.status = ?';
      params.push(status);
    }
    query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [orders] = await db.query(query, params);

    // Attach items
    for (const order of orders) {
      const [items] = await db.query(
        'SELECT * FROM order_items WHERE order_id = ?', [order.id]
      );
      order.items = items;
    }

    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── UPDATE ORDER STATUS ──
router.put('/orders/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['confirmed', 'packed', 'dispatched', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }
    await db.query(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, req.params.id]
    );
    res.json({ success: true, message: `Order status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET ALL PRODUCTS ──
router.get('/products', async (req, res) => {
  try {
    const [products] = await db.query('SELECT * FROM products ORDER BY created_at DESC');
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── ADD PRODUCT ──
router.post('/products', async (req, res) => {
  try {
    const { name, category, price, old_price, weight, description, image_url, in_stock, is_featured, is_deal } = req.body;
    if (!name || !category || !price) {
      return res.status(400).json({ success: false, message: 'Name, category and price required.' });
    }
    const [result] = await db.query(
      `INSERT INTO products (name, category, price, old_price, weight, description, image_url, in_stock, is_featured, is_deal)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, category, price, old_price || null, weight || null, description || null,
       image_url || null, in_stock ?? 1, is_featured ?? 0, is_deal ?? 0]
    );
    res.status(201).json({ success: true, message: 'Product added!', product_id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── UPDATE PRODUCT ──
router.put('/products/:id', async (req, res) => {
  try {
    const { name, category, price, old_price, weight, description, image_url, in_stock, is_featured, is_deal } = req.body;
    await db.query(
      `UPDATE products SET name=?, category=?, price=?, old_price=?, weight=?,
       description=?, image_url=?, in_stock=?, is_featured=?, is_deal=?
       WHERE id=?`,
      [name, category, price, old_price || null, weight || null, description || null,
       image_url || null, in_stock ?? 1, is_featured ?? 0, is_deal ?? 0, req.params.id]
    );
    res.json({ success: true, message: 'Product updated!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE PRODUCT ──
router.delete('/products/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Product deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET ALL USERS ──
router.get('/users', async (req, res) => {
  try {
    const [users] = await db.query(
      "SELECT id, name, email, phone, role, created_at FROM users WHERE role = 'customer' ORDER BY created_at DESC"
    );
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET PINCODES ──
router.get('/pincodes', async (req, res) => {
  try {
    const [pincodes] = await db.query('SELECT * FROM serviceable_pincodes ORDER BY pincode ASC');
    res.json({ success: true, pincodes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── ADD PINCODE ──
router.post('/pincodes', async (req, res) => {
  try {
    const { pincode, area_name } = req.body;
    if (!pincode) return res.status(400).json({ success: false, message: 'Pincode required.' });
    await db.query(
      'INSERT IGNORE INTO serviceable_pincodes (pincode, area_name) VALUES (?, ?)',
      [pincode, area_name || null]
    );
    res.status(201).json({ success: true, message: 'Pincode added!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE PINCODE by pincode value ──
router.delete('/pincodes/:pin', async (req, res) => {
  try {
    await db.query('DELETE FROM serviceable_pincodes WHERE pincode = ?', [req.params.pin]);
    res.json({ success: true, message: 'Pincode removed.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── RESET PINCODES to defaults ──
router.post('/pincodes/reset', async (req, res) => {
  try {
    const { pins } = req.body;
    if (!pins || !pins.length) return res.status(400).json({ success: false, message: 'Pins required.' });
    await db.query('DELETE FROM serviceable_pincodes');
    for (const pin of pins) {
      await db.query(
        'INSERT IGNORE INTO serviceable_pincodes (pincode, area_name, is_active) VALUES (?, ?, 1)',
        [pin, '']
      );
    }
    res.json({ success: true, message: 'Pincodes reset to defaults!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET ALL CATEGORIES ──
router.get('/categories', async (req, res) => {
  try {
    const [cats] = await db.query('SELECT * FROM categories ORDER BY id ASC');
    res.json({ success: true, categories: cats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── ADD CATEGORY ──
router.post('/categories', async (req, res) => {
  try {
    const { name, emoji } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Category name required.' });
    const [result] = await db.query(
      'INSERT INTO categories (name, emoji, is_visible) VALUES (?, ?, 1)',
      [name, emoji || '📦']
    );
    res.status(201).json({ success: true, message: 'Category added!', id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── TOGGLE CATEGORY VISIBILITY ──
router.put('/categories/:id', async (req, res) => {
  try {
    const { is_visible } = req.body;
    await db.query('UPDATE categories SET is_visible = ? WHERE id = ?', [is_visible, req.params.id]);
    res.json({ success: true, message: 'Category updated!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE CATEGORY ──
router.delete('/categories/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Category deleted!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    /* Prevent deleting admin accounts */
    const [user] = await db.query('SELECT role FROM users WHERE id = ?', [userId]);
    if (!user.length) return res.status(404).json({ success: false, message: 'User not found.' });
    if (user[0].role === 'admin') return res.status(403).json({ success: false, message: 'Cannot delete admin accounts.' });

    /* Delete user's addresses and orders first (foreign key safety) */
    await db.query('DELETE FROM addresses WHERE user_id = ?', [userId]);
    await db.query('DELETE FROM users WHERE id = ?', [userId]);

    res.json({ success: true, message: 'Customer deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// ══ COUPON CRUD ══

// GET all coupons
router.get('/coupons', async (req, res) => {
  try {
    const [coupons] = await db.query('SELECT * FROM coupons ORDER BY id DESC');
    res.json({ success: true, coupons });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST add coupon
router.post('/coupons', async (req, res) => {
  try {
    const { code, type, discount, min_order, max_uses, expiry_date } = req.body;
    if (!code || !discount) return res.status(400).json({ success: false, message: 'Code and discount required.' });
    await db.query(
      'INSERT INTO coupons (code, type, discount, min_order, max_uses, expiry_date, is_active) VALUES (?,?,?,?,?,?,1)',
      [code.toUpperCase(), type||'percent', discount, min_order||0, max_uses||9999, expiry_date||null]
    );
    res.status(201).json({ success: true, message: 'Coupon created!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT toggle coupon active/inactive
router.put('/coupons/:id', async (req, res) => {
  try {
    const { is_active } = req.body;
    await db.query('UPDATE coupons SET is_active = ? WHERE id = ?', [is_active, req.params.id]);
    res.json({ success: true, message: 'Coupon updated!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE coupon
router.delete('/coupons/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM coupons WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Coupon deleted!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;