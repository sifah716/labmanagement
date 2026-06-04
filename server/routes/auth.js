// ============ AUTHENTICATION ROUTES ============
const express = require('express');
const crypto = require('crypto');
const { db, hashPassword } = require('../database/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// POST /login
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username dan password harus diisi" });
  }

  const hashedPassword = hashPassword(password);

  db.get(
    "SELECT id, username, role FROM users WHERE username=? AND password=?",
    [username, hashedPassword],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: "Database error" });
      }
      if (!user) {
        return res.status(401).json({ error: "Username atau password salah" });
      }

      // Generate token
      const token = crypto.randomBytes(32).toString('hex');

      db.run("UPDATE users SET token=? WHERE id=?", [token, user.id], (updateErr) => {
        if (updateErr) {
          return res.status(500).json({ error: "Database error" });
        }

        res.json({
          success: true,
          token: token,
          user: {
            id: user.id,
            username: user.username,
            role: user.role
          }
        });
      });
    }
  );
});

// POST /logout
router.post("/logout", authenticate, (req, res) => {
  db.run("UPDATE users SET token=NULL WHERE id=?", [req.user.id], (err) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    res.json({ success: true });
  });
});

// GET /me
router.get("/me", authenticate, (req, res) => {
  res.json({
    id: req.user.id,
    username: req.user.username,
    role: req.user.role
  });
});

// Health check endpoint (no auth required)
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Debug endpoint to check if users exist (remove in production)
router.get("/debug/users", (req, res) => {
  db.all("SELECT id, username, role, created_at FROM users", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({
      count: rows.length,
      users: rows,
      note: "Passwords are hashed and not shown"
    });
  });
});

module.exports = router;