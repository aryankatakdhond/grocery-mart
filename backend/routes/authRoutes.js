// ============================================
// routes/authRoutes.js
// Handles: Register, Login, Email Verification
// ============================================

const express      = require('express');
const router       = express.Router();
const db           = require('../config/db');
const bcrypt       = require('bcryptjs');
const jwt          = require('jsonwebtoken');
const nodemailer   = require('nodemailer');
const crypto       = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'grocerymart_super_secret_key_change_this';
const EMAIL_CONFIGURED = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
const FRONTEND_BASE_URL = process.env.FRONTEND_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5000';

// ── Email transporter ──
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ── Helper: send verification email ──
async function sendVerificationEmail(email, name, token) {
  const link = `${FRONTEND_BASE_URL}/verify-email.html?token=${token}`;
  await transporter.sendMail({
    from:    `"Grocery Mart" <${process.env.EMAIL_USER}>`,
    to:      email,
    subject: '✅ Verify your Grocery Mart account',
    html: `
      <div style="font-family:Poppins,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f4f6f8;">
        <div style="background:#fff;border-radius:16px;padding:32px;border:1px solid #e0e0e0;">
          <h2 style="color:#1a2e22;margin:0 0 8px;">👋 Hi ${name}!</h2>
          <p style="color:#555;font-size:15px;margin:0 0 24px;">Thanks for signing up at <strong>Grocery Mart</strong>. Please verify your email to activate your account.</p>
          <a href="${link}" style="display:inline-block;background:#2d6a4f;color:#fff;padding:14px 28px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none;">
            ✅ Verify My Email
          </a>
          <p style="color:#aaa;font-size:12px;margin:24px 0 0;">This link expires in <strong>24 hours</strong>. If you didn't sign up, ignore this email.</p>
        </div>
      </div>
    `
  });
}


// ── POST /api/auth/register ──
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required.' });
    }

    const [existingUser] = await db.query(
      'SELECT id FROM users WHERE email = ?', [email]
    );
    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'Email already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      'INSERT INTO users (name, email, phone, password, role, is_verified) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, phone || null, hashedPassword, 'customer', 1]
    );

    const token = jwt.sign(
      { id: result.insertId, name, email, role: 'customer' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      message: 'Account created successfully!',
      token,
      user: { id: result.insertId, name, email, role: 'customer' }
    });

  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});


// ── GET /api/auth/verify-email?token=... ──
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ success: false, message: 'Token missing.' });

    const [rows] = await db.query(
      'SELECT * FROM users WHERE verification_token = ? AND verification_expires > NOW()',
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Link is invalid or has expired.' });
    }

    const user = rows[0];

    await db.query(
      'UPDATE users SET is_verified = 1, verification_token = NULL, verification_expires = NULL WHERE id = ?',
      [user.id]
    );

    // Issue JWT so user is logged in immediately after verifying
    const jwtToken = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Email verified successfully! You are now logged in.',
      token: jwtToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });

  } catch (err) {
    console.error('Verify email error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});


// ── POST /api/auth/resend-verification ──
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(404).json({ message: 'Email not found.' });

    const user = rows[0];
    if (user.is_verified) return res.status(400).json({ message: 'Email is already verified.' });

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry       = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.query(
      'UPDATE users SET verification_token = ?, verification_expires = ? WHERE id = ?',
      [verificationToken, tokenExpiry, user.id]
    );

    await sendVerificationEmail(email, user.name, verificationToken);
    res.json({ message: 'Verification email resent! Please check your inbox.' });

  } catch (err) {
    console.error('Resend error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});


// ── POST /api/auth/login ──
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const user = rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Login successful!',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});




// ── POST /api/auth/forgot-password ──
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required.' });

    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

    // Always respond the same way — don't reveal if email exists
    if (rows.length === 0) {
      return res.json({ message: 'If that email is registered, a reset link has been sent.' });
    }

    const user  = rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.query(
      'UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?',
      [token, expiry, user.id]
    );

    const resetLink = `${FRONTEND_BASE_URL}/reset-password.html?token=${token}&email=${encodeURIComponent(email)}`;

    await transporter.sendMail({
      from:    `"Grocery Mart" <${process.env.EMAIL_USER}>`,
      to:      email,
      subject: '🔑 Reset your Grocery Mart password',
      html: `
        <div style="font-family:Poppins,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f4f6f8;">
          <div style="background:#fff;border-radius:16px;padding:32px;border:1px solid #e0e0e0;">
            <h2 style="color:#1a2e22;margin:0 0 8px;">🔑 Password Reset</h2>
            <p style="color:#555;font-size:15px;margin:0 0 24px;">Hi ${user.name},<br/>We received a request to reset your password. Click the button below to set a new one.</p>
            <a href="${resetLink}" style="display:inline-block;background:#2d6a4f;color:#fff;padding:14px 28px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none;">
              🔑 Reset My Password
            </a>
            <p style="color:#aaa;font-size:12px;margin:24px 0 0;">This link expires in <strong>1 hour</strong>. If you didn't request a reset, ignore this email — your password won't change.</p>
          </div>
        </div>
      `
    });

    res.json({ message: 'If that email is registered, a reset link has been sent.' });

  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});


// ── POST /api/auth/reset-password ──
router.post('/reset-password', async (req, res) => {
  try {
    const { token, email, password } = req.body;

    if (!token || !email || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const [rows] = await db.query(
      'SELECT * FROM users WHERE email = ? AND reset_token = ? AND reset_expires > NOW()',
      [email, token]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Reset link is invalid or has expired. Please request a new one.' });
    }

    const hashed = await bcrypt.hash(password, 10);

    await db.query(
      'UPDATE users SET password = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?',
      [hashed, rows[0].id]
    );

    res.json({ message: 'Password reset successfully! You can now log in.' });

  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

module.exports = router;