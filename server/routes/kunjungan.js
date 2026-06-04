// ============ KUNJUNGAN ROUTES ============
const express = require('express');
const { db } = require('../database/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /kunjungan - Get all kunjungan with optional search
router.get("/", authenticate, (req, res) => {
  const search = req.query.search || '';
  let query = "SELECT * FROM kunjungan";
  let params = [];

  if (search) {
    query += " WHERE nama_guru LIKE ? OR kelas_diajar LIKE ?";
    params = [`%${search}%`, `%${search}%`];
  }

  query += " ORDER BY tanggal DESC, jam_mulai DESC";

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Database error", details: err.message });
    }
    res.json(rows || []);
  });
});

// POST /kunjungan - Create new kunjungan
router.post("/", authenticate, (req, res) => {
  const { nama_guru, kelas_diajar, jam_mulai, jam_selesai, tanggal } = req.body;
  if (!nama_guru || !kelas_diajar || !jam_mulai || !jam_selesai) {
    return res.status(400).json({ error: "Semua field harus diisi" });
  }

  const tanggalKunjung = tanggal ? tanggal : new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();

  db.run(
    "INSERT INTO kunjungan (nama_guru, kelas_diajar, jam_mulai, jam_selesai, tanggal, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [nama_guru, kelas_diajar, jam_mulai, jam_selesai, tanggalKunjung, now],
    function(err) {
      if (err) {
        return res.status(500).json({ error: "Database error", details: err.message });
      }
      res.status(201).json({ success: true, id: this.lastID });
    }
  );
});

// PUT /kunjungan/:id - Update kunjungan
router.put("/:id", authenticate, (req, res) => {
  const id = parseInt(req.params.id);
  const { nama_guru, kelas_diajar, jam_mulai, jam_selesai, tanggal } = req.body;

  if (!id || !nama_guru || !kelas_diajar || !jam_mulai || !jam_selesai) {
    return res.status(400).json({ error: "Field tidak lengkap" });
  }

  const tanggalKunjung = tanggal ? tanggal : new Date().toISOString().split('T')[0];

  db.run(
    "UPDATE kunjungan SET nama_guru=?, kelas_diajar=?, jam_mulai=?, jam_selesai=?, tanggal=? WHERE id=?",
    [nama_guru, kelas_diajar, jam_mulai, jam_selesai, tanggalKunjung, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: "Database error", details: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: "Kunjungan tidak ditemukan" });
      }
      res.json({ success: true });
    }
  );
});

// DELETE /kunjungan/:id - Delete kunjungan (Admin only)
router.delete("/:id", authenticate, requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "ID tidak valid" });
  }

  db.run("DELETE FROM kunjungan WHERE id=?", [id], function(err) {
    if (err) {
      return res.status(500).json({ error: "Database error", details: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "Kunjungan tidak ditemukan" });
    }
    res.json({ success: true });
  });
});

module.exports = router;