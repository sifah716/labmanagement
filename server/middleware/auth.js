// ============ AUTHENTICATION MIDDLEWARE ============
const { db } = require('../database/db');

// Middleware untuk autentikasi
function authenticate(req, res, next) {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  db.get("SELECT * FROM users WHERE token=?", [token], (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: "Invalid token" });
    }
    req.user = user;
    next();
  });
}

// Middleware untuk super admin
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: "Forbidden: Admin only" });
  }
  next();
}

module.exports = {
  authenticate,
  requireAdmin
};