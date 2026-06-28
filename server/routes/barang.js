
const express = require('express');
const { body, validationResult } = require('express-validator');
const { db, isUniqueError } = require('../database/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get("/", authenticate, (req, res) => {
  const search = req.query.search || '';

  let whereClause = '';
  let params = [];
  if (search) {
    whereClause = " WHERE nama LIKE ? OR kode LIKE ?";
    params = [`%${search}%`, `%${search}%`];
  }

  if (req.query.page) {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    db.get(`SELECT COUNT(*) as total FROM barang${whereClause}`, params, (countErr, countRow) => {
      if (countErr) return res.status(500).json({ error: "Database error", details: countErr.message });
      db.all(`SELECT * FROM barang${whereClause} ORDER BY nama ASC LIMIT ? OFFSET ?`, [...params, limit, offset], (err, rows) => {
        if (err) return res.status(500).json({ error: "Database error", details: err.message });
        res.json({ data: rows || [], pagination: { page, limit, total: countRow.total, totalPages: Math.ceil(countRow.total / limit) } });
      });
    });
  } else {
    let query = "SELECT * FROM barang" + whereClause + " ORDER BY nama ASC";
    db.all(query, params, (err, rows) => {
      if (err) return res.status(500).json({ error: "Database error", details: err.message });
      res.json(rows || []);
    });
  }
});

router.post("/", authenticate, requireAdmin, [
  body('nama').trim().notEmpty().withMessage('Nama barang harus diisi'),
  body('kode').trim().notEmpty().withMessage('Kode barang harus diisi'),
  body('stok').isInt({ min: 0 }).withMessage('Stok harus angka >= 0')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  const { nama, kode, stok } = req.body;

  const now = new Date().toISOString();
  db.run(
    "INSERT INTO barang (nama, kode, stok, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    [nama, kode, parseInt(stok), now, now],
    function(err) {
      if (err) {
        if (isUniqueError(err)) {
          return res.status(400).json({ error: "Kode barang sudah ada" });
        }
        return res.status(500).json({ error: "Database error", details: err.message });
      }
      res.status(201).json({ success: true, id: this.lastID });
    }
  );
});

router.put("/:id", authenticate, requireAdmin, [
  body('nama').trim().notEmpty().withMessage('Nama barang harus diisi'),
  body('kode').trim().notEmpty().withMessage('Kode barang harus diisi'),
  body('stok').isInt({ min: 0 }).withMessage('Stok harus angka >= 0')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  const id = parseInt(req.params.id);
  const { nama, kode, stok } = req.body;

  const now = new Date().toISOString();
  db.run(
    "UPDATE barang SET nama=?, kode=?, stok=?, updated_at=? WHERE id=?",
    [nama, kode, parseInt(stok), now, id],
    function(err) {
      if (err) {
        if (isUniqueError(err)) {
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

router.delete("/:id", authenticate, requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  if (!id || isNaN(id) || id <= 0) {
    return res.status(400).json({ error: "ID tidak valid" });
  }

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