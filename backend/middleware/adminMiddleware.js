// ============================================
// middleware/adminMiddleware.js
// Checks that logged in user has admin role
// ============================================

module.exports = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }
  next();
};
