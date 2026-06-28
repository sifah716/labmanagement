
const express = require('express');
const { body, validationResult } = require('express-validator');
const { db, hashPassword, isUniqueError } = require('../database/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get("/", authenticate, requireAdmin, (req, res) => {
  const search = req.query.search || '';

  let whereClause = '';
  let params = [];
  if (search) {
    whereClause = " WHERE username LIKE ? OR display_name LIKE ?";
    params = [`%${search}%`, `%${search}%`];
  }

  if (req.query.page) {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    db.get(`SELECT COUNT(*) as total FROM users${whereClause}`, params, (countErr, countRow) => {
      if (countErr) return res.status(500).json({ error: "Database error" });
      db.all(`SELECT id, username, role, display_name, lab, created_at FROM users${whereClause} ORDER BY id ASC LIMIT ? OFFSET ?`, [...params, limit, offset], (err, rows) => {
        if (err) return res.status(500).json({ error: "Database error" });
        res.json({ data: rows || [], pagination: { page, limit, total: countRow.total, totalPages: Math.ceil(countRow.total / limit) } });
      });
    });
  } else {
    db.all("SELECT id, username, role, display_name, lab, created_at FROM users ORDER BY id ASC", [], (err, rows) => {
      if (err) return res.status(500).json({ error: "Database error" });
      res.json(rows || []);
    });
  }
});

router.post("/", authenticate, requireAdmin, [
  body('username').trim().notEmpty().withMessage('Username harus diisi'),
  body('password').isLength({ min: 6 }).withMessage('Password minimal 6 karakter'),
  body('role').optional().isIn(['admin', 'user']).withMessage('Role tidak valid'),
  body('display_name').optional().trim(),
  body('lab').optional().trim()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  const { username, password, role, display_name, lab } = req.body;

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

router.put("/:id", authenticate, requireAdmin, [
  body('username').optional().trim(),
  body('password').optional().isLength({ min: 6 }).withMessage('Password minimal 6 karakter'),
  body('role').optional().isIn(['admin', 'user']).withMessage('Role tidak valid'),
  body('display_name').optional().trim(),
  body('lab').optional().trim()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  const id = parseInt(req.params.id);
  if (!id || isNaN(id) || id <= 0) return res.status(400).json({ error: "ID tidak valid" });

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
      updates.push("password=?");
      params.push(hashPassword(password));
    }
    if (role !== undefined) {
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