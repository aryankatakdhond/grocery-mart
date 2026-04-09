// ============================================
// server.js — Grocery Mart Backend
// ============================================

require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const bcrypt  = require('bcryptjs');
const db      = require('./config/db');

const app = express();

// ── MIDDLEWARE ──

// Allow ALL origins during development
function isAllowedOrigin(origin) {
  if (!origin) return true;

  if (origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.includes('file://')) {
    return true;
  }

  if (/\.onrender\.com$/.test(origin) || /\.render\.com$/.test(origin)) {
    return true;
  }

  if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
    return true;
  }

  return false;
}

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman)
    // and trusted local or Render-hosted frontends.
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Serve frontend static files from root folder
app.use(express.static(path.join(__dirname, '../')));

// ── ROUTES ──
app.use('/api/auth',     require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/orders',   require('./routes/orderRoutes'));
app.use('/api/user',     require('./routes/userRoutes'));
app.use('/api/admin',    require('./routes/adminRoutes'));
app.use('/api/coupons',  require('./routes/couponRoutes'));
app.use('/api/shop',     require('./routes/Shoproutes'));

// ── HEALTH CHECK ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Grocery Mart API is running!' });
});

// ── 404 HANDLER ──
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ── ERROR HANDLER ──
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

async function ensureAuthColumns() {
  // Keep existing databases compatible with current auth features.
  async function addColumnIfMissing(columnName, definitionSql) {
    const [rows] = await db.query(
      `SELECT 1
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'users'
         AND COLUMN_NAME = ?
       LIMIT 1`,
      [columnName]
    );

    if (rows.length === 0) {
      await db.query(`ALTER TABLE users ADD COLUMN ${definitionSql}`);
    }
  }

  await addColumnIfMissing('is_verified', 'is_verified TINYINT(1) NOT NULL DEFAULT 0');
  await addColumnIfMissing('verification_token', 'verification_token VARCHAR(255) NULL');
  await addColumnIfMissing('verification_expires', 'verification_expires DATETIME NULL');
  await addColumnIfMissing('reset_token', 'reset_token VARCHAR(255) NULL');
  await addColumnIfMissing('reset_expires', 'reset_expires DATETIME NULL');
  await db.query("UPDATE users SET is_verified = 1 WHERE role = 'admin'");
}

async function ensureAdminCredentials() {
  const adminEmail = 'admin@grocerymart.com';
  const adminName = 'Admin';
  const adminPassword = 'admin123';
  const adminPhone = '9999999999';

  const [rows] = await db.query('SELECT id, password FROM users WHERE email = ? LIMIT 1', [adminEmail]);
  const hash = await bcrypt.hash(adminPassword, 10);

  if (rows.length === 0) {
    await db.query(
      'INSERT INTO users (name, email, phone, password, role, is_verified) VALUES (?, ?, ?, ?, ?, ?)',
      [adminName, adminEmail, adminPhone, hash, 'admin', 1]
    );
    return;
  }

  const existing = rows[0];
  const matches = await bcrypt.compare(adminPassword, existing.password);
  if (!matches) {
    await db.query(
      'UPDATE users SET password = ?, role = ?, is_verified = 1 WHERE id = ?',
      [hash, 'admin', existing.id]
    );
  } else {
    await db.query(
      'UPDATE users SET role = ?, is_verified = 1 WHERE id = ?',
      ['admin', existing.id]
    );
  }
}

// ── START SERVER ──
const PORT = process.env.PORT || 5000;

(async function startServer() {
  try {
    await ensureAuthColumns();
    await ensureAdminCredentials();
    console.log('✅ Auth schema check complete');
  } catch (err) {
    console.error('⚠️ Auth schema check failed:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`✅ Server running  → http://localhost:${PORT}`);
    console.log(`📦 API health      → http://localhost:${PORT}/api/health`);
  });
})();