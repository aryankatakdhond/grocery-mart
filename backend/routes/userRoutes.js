// ============================================
// routes/userRoutes.js
// GET  /api/user/profile        — get profile
// PUT  /api/user/profile        — update profile
// GET  /api/user/addresses      — get all addresses
// POST /api/user/addresses      — add new address
// PUT  /api/user/addresses/:id  — update address
// DELETE /api/user/addresses/:id— delete address
// PUT  /api/user/addresses/:id/default — set as default
// ============================================

const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const auth    = require('../middleware/authMiddleware');
const bcrypt  = require('bcryptjs');

// ── GET profile ──
router.get('/profile', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── UPDATE profile ──
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, phone, password } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name required.' });

    if (password) {
      // If changing password, hash the new one
      const hashed = await bcrypt.hash(password, 10);
      await db.query(
        'UPDATE users SET name = ?, phone = ?, password = ? WHERE id = ?',
        [name, phone || null, hashed, req.user.id]
      );
    } else {
      await db.query(
        'UPDATE users SET name = ?, phone = ? WHERE id = ?',
        [name, phone || null, req.user.id]
      );
    }
    res.json({ success: true, message: 'Profile updated!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET all addresses ──
router.get('/addresses', auth, async (req, res) => {
  try {
    const [addresses] = await db.query(
      'SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC',
      [req.user.id]
    );
    res.json({ success: true, addresses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── ADD new address ──
router.post('/addresses', auth, async (req, res) => {
  try {
    const { name, phone, flat, street, city, pincode, state, type } = req.body;
    if (!name || !flat || !street || !city || !pincode) {
      return res.status(400).json({ success: false, message: 'Please fill all required fields.' });
    }

    // If this is user's first address, make it default
    const [existing] = await db.query(
      'SELECT id FROM addresses WHERE user_id = ?', [req.user.id]
    );
    const isDefault = existing.length === 0 ? 1 : 0;

    const [result] = await db.query(
      `INSERT INTO addresses
       (user_id, name, phone, flat, street, city, pincode, state, type, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, name, phone || null, flat, street, city, pincode, state || null, type || 'Home', isDefault]
    );

    res.status(201).json({
      success: true,
      message: 'Address added!',
      address_id: result.insertId
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE address ──
router.delete('/addresses/:id', auth, async (req, res) => {
  try {
    await db.query(
      'DELETE FROM addresses WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ success: true, message: 'Address removed.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── SET default address ──
router.put('/addresses/:id/default', auth, async (req, res) => {
  try {
    // Remove default from all
    await db.query(
      'UPDATE addresses SET is_default = 0 WHERE user_id = ?',
      [req.user.id]
    );
    // Set new default
    await db.query(
      'UPDATE addresses SET is_default = 1 WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ success: true, message: 'Default address updated!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
