// ============ BARANG ROUTES ============
const express = require('express');
const { db } = require('../database/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /barang - Get all barang with optional search
router.get("/", authenticate, (req, res) => {
  const search = req.query.search || '';
  let query = "SELECT * FROM barang";
  let params = [];

  if (search) {
    query += " WHERE nama LIKE ? OR kode LIKE ?";
    params = [`%${search}%`, `%${search}%`];
  }

  query += " ORDER BY nama ASC";

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Database error", details: err.message });
    }
    res.json(rows || []);
  });
});

// POST /barang - Create new barang
router.post("/", authenticate, requireAdmin, (req, res) => {
  const { nama, kode, stok } = req.body;
  if (!nama || !kode || stok === undefined || stok === null) {
    return res.status(400).json({ error: "Field nama, kode, dan stok harus diisi" });
  }
  if (stok < 0) {
    return res.status(400).json({ error: "Stok tidak boleh negatif" });
  }

  const now = new Date().toISOString();
  db.run(
    "INSERT INTO barang (nama, kode, stok, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    [nama, kode, parseInt(stok), now, now],
    function(err) {
      if (err) {
        if (err.message.includes("UNIQUE")) {
          return res.status(400).json({ error: "Kode barang sudah ada" });
        }
        return res.status(500).json({ error: "Database error", details: err.message });
      }
      res.status(201).json({ success: true, id: this.lastID });
    }
  );
});

// PUT /barang/:id - Update barang
router.put("/:id", authenticate, requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const { nama, kode, stok } = req.body;

  if (!id || !nama || !kode || stok === undefined || stok === null) {
    return res.status(400).json({ error: "Field tidak lengkap" });
  }

  if (stok < 0) {
    return res.status(400).json({ error: "Stok tidak boleh negatif" });
  }

  const now = new Date().toISOString();
  db.run(
    "UPDATE barang SET nama=?, kode=?, stok=?, updated_at=? WHERE id=?",
    [nama, kode, parseInt(stok), now, id],
    function(err) {
      if (err) {
        if (err.message.includes("UNIQUE")) {
          return res.status(400).json({ error: "Kode barang sudah ada" });
        }
        return res.status(500).json({ error: "Database error", details: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: "Barang tidak ditemukan" });
      }
      res.json({ success: true });
    }
  );
});

// DELETE /barang/:id - Delete barang
router.delete("/:id", authenticate, requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "ID tidak valid" });
  }

  // Check if barang is being borrowed
  db.get(
    "SELECT COUNT(*) as count FROM peminjaman WHERE barang_id=? AND status='dipinjam'",
    [id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: "Database error" });
      }
      if (row.count > 0) {
        return res.status(400).json({ error: "Barang sedang dipinjam, tidak bisa dihapus" });
      }

      db.run("DELETE FROM barang WHERE id=?", [id], function(deleteErr) {
        if (deleteErr) {
          return res.status(500).json({ error: "Database error", details: deleteErr.message });
        }
        if (this.changes === 0) {
          return res.status(404).json({ error: "Barang tidak ditemukan" });
        }
        res.json({ success: true });
      });
    }
  );
});

module.exports = router;