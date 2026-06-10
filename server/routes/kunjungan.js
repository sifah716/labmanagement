// ============ KUNJUNGAN ROUTES ============
const express = require('express');
const { db, addNotification } = require('../database/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /kunjungan — Get all kunjungan with optional search, filter by user/lab
router.get("/", authenticate, (req, res) => {
  const search = req.query.search || '';
  const created_by = req.query.created_by || '';
  const user_lab = req.query.user_lab || '';

  let query = `
    SELECT k.*, u.display_name as display_name, u.lab as creator_lab
    FROM kunjungan k
    LEFT JOIN users u ON k.created_by = u.id
    WHERE 1=1
  `;
  let params = [];

  if (search) {
    query += " AND (k.nama_guru LIKE ? OR k.kelas_diajar LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  if (created_by) {
    query += " AND u.username = ?";
    params.push(created_by);
  }

  if (user_lab) {
    query += " AND k.user_lab = ?";
    params.push(user_lab);
  }

  query += " ORDER BY k.tanggal DESC, k.jam_mulai DESC";

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Database error", details: err.message });
    }
    res.json(rows || []);
  });
});

// GET /kunjungan/labs — Daftar lab yang punya data kunjungan
router.get("/labs", authenticate, (req, res) => {
  db.all("SELECT DISTINCT user_lab as lab FROM kunjungan WHERE user_lab != '' ORDER BY user_lab", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(rows || []);
  });
});

// POST /kunjungan — Create new kunjungan
router.post("/", authenticate, (req, res) => {
  const { nama_guru, kelas_diajar, jam_mulai, jam_selesai, tanggal } = req.body;
  if (!nama_guru || !kelas_diajar || !jam_mulai || !jam_selesai) {
    return res.status(400).json({ error: "Semua field harus diisi" });
  }

  const tanggalKunjung = tanggal ? tanggal : new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();

  db.run(
    "INSERT INTO kunjungan (nama_guru, kelas_diajar, jam_mulai, jam_selesai, tanggal, created_by, user_lab, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [nama_guru, kelas_diajar, jam_mulai, jam_selesai, tanggalKunjung, req.user.id, req.user.lab || '', now],
    function(err) {
      if (err) {
        return res.status(500).json({ error: "Database error", details: err.message });
      }
      // Notifikasi
      const detail = JSON.stringify({ nama_guru, kelas_diajar, jam_mulai, jam_selesai, lab: req.user.lab || '' });
      const display = req.user.display_name || req.user.username;
      addNotification('kunjungan', `${display} menambahkan kunjungan`, detail);
      res.status(201).json({ success: true, id: this.lastID });
    }
  );
});

// PUT /kunjungan/:id — Update kunjungan
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

// DELETE /kunjungan/:id — Delete kunjungan (Admin only)
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