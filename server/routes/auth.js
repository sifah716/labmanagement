// ============ AUTHENTICATION ROUTES ============
const express = require('express');
const crypto = require('crypto');
const { db, hashPassword, addNotification } = require('../database/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// POST /login
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username dan password harus diisi" });
  }

  const hashedPassword = hashPassword(password);

  db.get(
    "SELECT id, username, role, display_name, lab FROM users WHERE username=? AND password=?",
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
            role: user.role,
            display_name: user.display_name || user.username,
            lab: user.lab || ''
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
    role: req.user.role,
    display_name: req.user.display_name || req.user.username,
    lab: req.user.lab || ''
  });
});

// PUT /profile — Edit profil sendiri
router.put("/profile", authenticate, (req, res) => {
  const { display_name, lab, current_password, new_password } = req.body;

  if (!display_name && !lab && !new_password) {
    return res.status(400).json({ error: "Tidak ada data yang diubah" });
  }

  // Jika mau ganti password, harus isi current_password
  if (new_password) {
    if (!current_password) {
      return res.status(400).json({ error: "Password saat ini harus diisi untuk mengganti password" });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: "Password baru minimal 6 karakter" });
    }

    const hashedCurrent = hashPassword(current_password);
    if (hashedCurrent !== req.user.password) {
      return res.status(400).json({ error: "Password saat ini salah" });
    }
  }

  const updates = [];
  const params = [];
  if (display_name !== undefined) {
    updates.push("display_name=?");
    params.push(display_name);
  }
  if (lab !== undefined) {
    updates.push("lab=?");
    params.push(lab);
  }
  if (new_password) {
    updates.push("password=?");
    params.push(hashPassword(new_password));
    // Force re-login: hapus token
    updates.push("token=NULL");
  }

  params.push(req.user.id);
  db.run(`UPDATE users SET ${updates.join(", ")} WHERE id=?`, params, function(err) {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    // Fetch updated user
    db.get("SELECT id, username, role, display_name, lab FROM users WHERE id=?", [req.user.id], (err2, user) => {
      if (err2) {
        return res.status(500).json({ error: "Database error" });
      }
      res.json({
        success: true,
        message: new_password ? "Profil dan password berhasil diupdate. Silakan login ulang." : "Profil berhasil diupdate",
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          display_name: user.display_name || user.username,
          lab: user.lab || ''
        },
        reLogin: !!new_password
      });
    });
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

// POST /forgot-password — Kirim request reset ke admin
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
      return res.json({ success: true, message: "Jika username terdaftar, permintaan akan dikirim ke admin." });
    }

    // Cek sudah ada request pending untuk user ini
    db.get("SELECT id FROM reset_requests WHERE user_id=? AND status='pending'", [user.id], (err2, existing) => {
      if (err2) return res.status(500).json({ error: "Database error" });
      if (existing) {
        return res.json({ success: true, message: "Permintaan reset password sudah dikirim. Tunggu persetujuan admin." });
      }

      const now = new Date().toISOString();
      db.run(
        "INSERT INTO reset_requests (user_id, username, status, created_at) VALUES (?, ?, 'pending', ?)",
        [user.id, user.username, now],
        function(insertErr) {
          if (insertErr) {
            return res.status(500).json({ error: "Database error" });
          }
          console.log(`\n[RESET REQUEST] User: ${user.username} (ID: ${user.id}) — menunggu persetujuan admin\n`);
          addNotification('reset_request', `${user.username} meminta reset password`, JSON.stringify({ username: user.username }));
          res.json({
            success: true,
            message: "Permintaan reset password telah dikirim ke admin. Silakan tunggu persetujuan."
          });
        }
      );
    });
  });
});

// GET /reset-requests — Admin lihat semua request
router.get("/reset-requests", authenticate, requireAdmin, (req, res) => {
  db.all(
    "SELECT id, user_id, username, status, created_at FROM reset_requests ORDER BY created_at DESC",
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json(rows || []);
    }
  );
});

// POST /reset-requests/:id/approve — Admin setujui & set password baru langsung
router.post("/reset-requests/:id/approve", authenticate, requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const { newPassword } = req.body;
  if (!id) return res.status(400).json({ error: "ID tidak valid" });
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: "Password baru minimal 6 karakter" });

  db.get("SELECT * FROM reset_requests WHERE id=? AND status='pending'", [id], (err, request) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (!request) return res.status(400).json({ error: "Request tidak ditemukan atau sudah diproses" });

    const hashed = hashPassword(newPassword);
    db.run("UPDATE users SET password=? WHERE id=?", [hashed, request.user_id], function(updateErr) {
      if (updateErr) return res.status(500).json({ error: "Database error" });
      db.run("UPDATE reset_requests SET status='approved' WHERE id=?", [id]);
      db.run("UPDATE users SET token=NULL WHERE id=?", [request.user_id]);

      const display = req.user.display_name || req.user.username;
      addNotification('reset_approved', `${display} menyetujui reset password ${request.username}`, JSON.stringify({ username: request.username }));

      res.json({ success: true, message: `Password ${request.username} berhasil direset` });
    });
  });
});

// POST /reset-requests/:id/deny — Admin tolak
router.post("/reset-requests/:id/deny", authenticate, requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: "ID tidak valid" });

  db.run("UPDATE reset_requests SET status='denied' WHERE id=? AND status='pending'",
    [id],
    function(err) {
      if (err) return res.status(500).json({ error: "Database error" });
      if (this.changes === 0) return res.status(400).json({ error: "Request tidak ditemukan atau sudah diproses" });
      res.json({ success: true, message: "Request ditolak" });
    }
  );
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

// GET /notifications — Ambil notifikasi (admin only)
router.get("/notifications", authenticate, requireAdmin, (req, res) => {
  db.all("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 20", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });
    const unread = rows ? rows.filter(n => !n.is_read).length : 0;
    res.json({ notifications: rows || [], unread_count: unread });
  });
});

// POST /notifications/read — Tandai semua sebagai sudah dibaca
router.post("/notifications/read", authenticate, requireAdmin, (req, res) => {
  db.run("UPDATE notifications SET is_read=1 WHERE is_read=0", [], function(err) {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json({ success: true });
  });
});

// DELETE /notifications/old — Hapus notifikasi > 7 hari
router.delete("/notifications/old", authenticate, requireAdmin, (req, res) => {
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  db.run("DELETE FROM notifications WHERE created_at < ?", [weekAgo]);
  res.json({ success: true });
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