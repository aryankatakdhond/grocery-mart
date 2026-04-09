// ============================================
// middleware/authMiddleware.js
// Verifies JWT token on protected routes
// ============================================

require('dotenv').config();

const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const JWT_SECRET = process.env.JWT_SECRET || 'grocerymart_super_secret_key_change_this';

  // Get token from Authorization header: "Bearer <token>"
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token. Please log in.' });
  }
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    // Token expired vs truly invalid — give user a clearer message
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token. Please log in again.' });
  }
};