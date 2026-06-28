
const { db } = require('../database/db');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  db.get("SELECT * FROM users WHERE token=?", [token], (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: "Invalid token" });
    }
    if (user.token_expires_at && new Date(user.token_expires_at) < new Date()) {
      db.run("UPDATE users SET token=NULL, token_expires_at=NULL WHERE id=?", [user.id]);
      return res.status(401).json({ error: "Token expired, silakan login ulang" });
    }
    req.user = user;
    next();
  });
}

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