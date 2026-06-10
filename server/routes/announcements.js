// ============ ANNOUNCEMENTS ROUTES ============
const express = require('express');
const { db } = require('../database/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /announcements - Get all announcements (public, no auth required)
router.get("/", (req, res) => {
  db.all(
    "SELECT id, title, description, updated_at FROM announcements ORDER BY id DESC",
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: "Database error", details: err.message });
      }
      res.json(rows || []);
    }
  );
});

// POST /announcements - Create new announcement (Admin only)
router.post("/", authenticate, requireAdmin, (req, res) => {
  const { title, description } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: "Title dan description harus diisi" });
  }

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

// PUT /announcements/:id - Update announcement (Admin only)
router.put("/:id", authenticate, requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const { title, description } = req.body;

  if (!id || !title || !description) {
    return res.status(400).json({ error: "ID, title, dan description harus diisi" });
  }

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

// DELETE /announcements/:id - Delete announcement (Admin only)
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
