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

// POST /forgot-password
router.post("/forgot-password", (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: "Username harus diisi" });
  }

  db.get("SELECT id, username FROM users WHERE username=?", [username], (err, user) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }

    // Jangan ungkap apakah user ditemukan atau tidak (security)
    if (!user) {
      return res.json({ success: true, message: "Jika username terdaftar, link reset password akan dibuat" });
    }

    // Hapus token lama yang belum dipakai
    db.run("DELETE FROM reset_tokens WHERE user_id=? AND used=0", [user.id]);

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 jam
    const now = new Date().toISOString();

    db.run(
      "INSERT INTO reset_tokens (user_id, token, expires_at, used, created_at) VALUES (?, ?, ?, 0, ?)",
      [user.id, token, expiresAt, now],
      function(insertErr) {
        if (insertErr) {
          return res.status(500).json({ error: "Database error" });
        }

        // Di production, ini akan dikirim via email
        // Untuk sekarang, kita return link nya langsung
        const resetLink = `${req.protocol}://${req.get('host')}/pages/auth/reset-password.html?token=${token}`;

        console.log(`\n[RESET PASSWORD] User: ${user.username}`);
        console.log(`[RESET PASSWORD] Link: ${resetLink}`);
        console.log(`[RESET PASSWORD] Berlaku hingga: ${expiresAt}\n`);

        res.json({
          success: true,
          message: "Link reset password telah dibuat. Cek console server untuk link reset (untuk development).",
          resetLink: resetLink,
          expiresAt: expiresAt
        });
      }
    );
  });
});

// POST /reset-password
router.post("/reset-password", (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: "Token dan password baru harus diisi" });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Password minimal 6 karakter" });
  }

  const now = new Date().toISOString();

  db.get(
    "SELECT * FROM reset_tokens WHERE token=? AND used=0 AND expires_at > ?",
    [token, now],
    (err, resetToken) => {
      if (err) {
        return res.status(500).json({ error: "Database error" });
      }
      if (!resetToken) {
        return res.status(400).json({ error: "Token tidak valid atau sudah kedaluwarsa" });
      }

      const hashedPassword = hashPassword(password);

      db.run("UPDATE users SET password=? WHERE id=?", [hashedPassword, resetToken.user_id], (updateErr) => {
        if (updateErr) {
          return res.status(500).json({ error: "Database error" });
        }

        // Hapus token yang sudah dipakai
        db.run("UPDATE reset_tokens SET used=1 WHERE id=?", [resetToken.id]);

        // Hapus token sesi user (paksa logout dari semua perangkat)
        db.run("UPDATE users SET token=NULL WHERE id=?", [resetToken.user_id]);

        res.json({
          success: true,
          message: "Password berhasil direset. Silakan login dengan password baru."
        });
      });
    }
  );
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