// ============================================
// routes/productRoutes.js
// GET /api/products         — all products
// GET /api/products/featured — popular products
// GET /api/products/deals    — today's deals
// GET /api/products/:id      — single product
// GET /api/products/search?q=— search products
// GET /api/products/category/:name — by category
// ============================================

const express = require('express');
const router  = express.Router();
const db      = require('../config/db');

// ── GET all products ──
router.get('/', async (req, res) => {
  try {
    const [products] = await db.query(
      'SELECT * FROM products WHERE in_stock = 1 ORDER BY created_at DESC'
    );
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET featured / popular products ──
router.get('/featured', async (req, res) => {
  try {
    const [products] = await db.query(
      'SELECT * FROM products WHERE is_featured = 1 ORDER BY rating DESC'
    );
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET deals ──
router.get('/deals', async (req, res) => {
  try {
    const [products] = await db.query(
      'SELECT * FROM products WHERE is_deal = 1 ORDER BY rating DESC'
    );
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── SEARCH products ──
router.get('/search', async (req, res) => {
  try {
    const q = req.query.q || '';
    const [products] = await db.query(
      `SELECT * FROM products
       WHERE (name LIKE ? OR category LIKE ? OR description LIKE ?)
       ORDER BY name ASC`,
      [`%${q}%`, `%${q}%`, `%${q}%`]
    );
    res.json({ success: true, products, query: q });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET by category ──
router.get('/category/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const [products] = name === 'All Categories'
      ? await db.query('SELECT * FROM products ORDER BY name ASC')
      : await db.query(
          'SELECT * FROM products WHERE category = ? ORDER BY name ASC',
          [name]
        );
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET single product by id ──
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM products WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, product: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET visible categories (public — for homepage nav) ──
router.get('/categories/all', async (req, res) => {
  try {
    const [cats] = await db.query(
      'SELECT id, name, emoji FROM categories WHERE is_visible = 1 ORDER BY id ASC'
    );
    res.json({ success: true, categories: cats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET visible categories (public — for homepage nav) ──
router.get('/categories/all', async (req, res) => {
  try {
    const [cats] = await db.query(
      'SELECT id, name, emoji FROM categories WHERE is_visible = 1 ORDER BY id ASC'
    );
    res.json({ success: true, categories: cats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;