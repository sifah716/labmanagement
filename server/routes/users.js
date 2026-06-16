
const express = require('express');
const crypto = require('crypto');
const { db, hashPassword, isUniqueError } = require('../database/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get("/", authenticate, requireAdmin, (req, res) => {
  db.all("SELECT id, username, role, display_name, lab, created_at FROM users ORDER BY id ASC", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    res.json(rows || []);
  });
});

router.post("/", authenticate, requireAdmin, (req, res) => {
  const { username, password, role, display_name, lab } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username dan password harus diisi" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password minimal 6 karakter" });
  }
  if (role && !['admin', 'user'].includes(role)) {
    return res.status(400).json({ error: "Role tidak valid" });
  }

  const hashedPassword = hashPassword(password);
  const now = new Date().toISOString();
  const userRole = role || 'user';

  db.run(
    "INSERT INTO users (username, password, role, display_name, lab, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [username, hashedPassword, userRole, display_name || username, lab || '', now],
    function(err) {
      if (err) {
        if (isUniqueError(err)) {
          return res.status(400).json({ error: "Username sudah digunakan" });
        }
        return res.status(500).json({ error: "Database error" });
      }
      res.status(201).json({ success: true, id: this.lastID });
    }
  );
});

router.put("/:id", authenticate, requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: "ID tidak valid" });

  const { username, password, role, display_name, lab } = req.body;

  db.get("SELECT id FROM users WHERE id=?", [id], (err, row) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (!row) return res.status(404).json({ error: "User tidak ditemukan" });

    const updates = [];
    const params = [];

    if (username !== undefined) {
      updates.push("username=?");
      params.push(username);
    }
    if (password) {
      if (password.length < 6) return res.status(400).json({ error: "Password minimal 6 karakter" });
      updates.push("password=?");
      params.push(hashPassword(password));
    }
    if (role !== undefined) {
      if (!['admin', 'user'].includes(role)) return res.status(400).json({ error: "Role tidak valid" });
      updates.push("role=?");
      params.push(role);
    }
    if (display_name !== undefined) {
      updates.push("display_name=?");
      params.push(display_name);
    }
    if (lab !== undefined) {
      updates.push("lab=?");
      params.push(lab);
    }

    if (updates.length === 0) {
      return res.json({ success: true });
    }

    params.push(id);
    db.run(`UPDATE users SET ${updates.join(", ")} WHERE id=?`, params, function(updateErr) {
      if (updateErr) {
        if (isUniqueError(updateErr)) {
          return res.status(400).json({ error: "Username sudah digunakan" });
        }
        return res.status(500).json({ error: "Database error" });
      }
      res.json({ success: true });
    });
  });
});

router.delete("/:id", authenticate, requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: "ID tidak valid" });

  if (id === req.user.id) {
    return res.status(400).json({ error: "Tidak bisa menghapus akun sendiri" });
  }

  db.get("SELECT id FROM users WHERE id=?", [id], (err, row) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (!row) return res.status(404).json({ error: "User tidak ditemukan" });

    db.run("DELETE FROM users WHERE id=?", [id], function(deleteErr) {
      if (deleteErr) return res.status(500).json({ error: "Database error" });
      res.json({ success: true });
    });
  });
});

router.get("/labs", authenticate, requireAdmin, (req, res) => {
  db.all("SELECT DISTINCT lab FROM users WHERE lab != '' ORDER BY lab", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(rows || []);
  });
});

module.exports = router;