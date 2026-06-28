
const express = require('express');
const { body, validationResult } = require('express-validator');
const { db } = require('../database/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get("/", (req, res) => {
  if (req.query.page) {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    db.get("SELECT COUNT(*) as total FROM announcements", [], (countErr, countRow) => {
      if (countErr) return res.status(500).json({ error: "Database error", details: countErr.message });
      db.all("SELECT id, title, description, updated_at FROM announcements ORDER BY id DESC LIMIT ? OFFSET ?", [limit, offset], (err, rows) => {
        if (err) return res.status(500).json({ error: "Database error", details: err.message });
        res.json({ data: rows || [], pagination: { page, limit, total: countRow.total, totalPages: Math.ceil(countRow.total / limit) } });
      });
    });
  } else {
    db.all("SELECT id, title, description, updated_at FROM announcements ORDER BY id DESC", [], (err, rows) => {
      if (err) return res.status(500).json({ error: "Database error", details: err.message });
      res.json(rows || []);
    });
  }
});

router.post("/", authenticate, requireAdmin, [
  body('title').trim().notEmpty().withMessage('Title harus diisi'),
  body('description').trim().notEmpty().withMessage('Description harus diisi')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  const { title, description } = req.body;

  const now = new Date().toISOString();

  db.run(
    "INSERT INTO announcements (title, description, created_at, updated_at) VALUES (?, ?, ?, ?)",
    [title, description, now, now],
    function(err) {
      if (err) {
        return res.status(500).json({ error: "Database error", details: err.message });
      }
      res.status(201).json({ success: true, id: this.lastID });
    }
  );
});

router.put("/:id", authenticate, requireAdmin, [
  body('title').trim().notEmpty().withMessage('Title harus diisi'),
  body('description').trim().notEmpty().withMessage('Description harus diisi')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  const id = parseInt(req.params.id);
  const { title, description } = req.body;

  const now = new Date().toISOString();

  db.run(
    "UPDATE announcements SET title=?, description=?, updated_at=? WHERE id=?",
    [title, description, now, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: "Database error", details: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: "Pengumuman tidak ditemukan" });
      }
      res.json({ success: true });
    }
  );
});

router.delete("/:id", authenticate, requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);

  if (!id) {
    return res.status(400).json({ error: "ID tidak valid" });
  }

  db.run("DELETE FROM announcements WHERE id=?", [id], function(err) {
    if (err) {
      return res.status(500).json({ error: "Database error", details: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "Pengumuman tidak ditemukan" });
    }
    res.json({ success: true });
  });
});

module.exports = router;
