
const express = require('express');
const { body, validationResult } = require('express-validator');
const { db, addNotification } = require('../database/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get("/", authenticate, (req, res) => {
  const search = req.query.search || '';
  const created_by = req.query.created_by || '';
  const user_lab = req.query.user_lab || '';

  const baseFrom = " FROM kunjungan k LEFT JOIN users u ON k.created_by = u.id";
  let whereClause = " WHERE 1=1";
  let params = [];

  if (search) {
    whereClause += " AND (k.nama_guru LIKE ? OR k.kelas_diajar LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }
  if (created_by) {
    whereClause += " AND u.username = ?";
    params.push(created_by);
  }
  if (user_lab) {
    whereClause += " AND k.user_lab = ?";
    params.push(user_lab);
  }

  if (req.query.page) {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    db.get(`SELECT COUNT(*) as total${baseFrom}${whereClause}`, params, (countErr, countRow) => {
      if (countErr) return res.status(500).json({ error: "Database error", details: countErr.message });
      db.all(`SELECT k.*, u.display_name as display_name, u.lab as creator_lab${baseFrom}${whereClause} ORDER BY k.tanggal DESC, k.jam_mulai DESC LIMIT ? OFFSET ?`, [...params, limit, offset], (err, rows) => {
        if (err) return res.status(500).json({ error: "Database error", details: err.message });
        res.json({ data: rows || [], pagination: { page, limit, total: countRow.total, totalPages: Math.ceil(countRow.total / limit) } });
      });
    });
  } else {
    db.all(`SELECT k.*, u.display_name as display_name, u.lab as creator_lab${baseFrom}${whereClause} ORDER BY k.tanggal DESC, k.jam_mulai DESC`, params, (err, rows) => {
      if (err) return res.status(500).json({ error: "Database error", details: err.message });
      res.json(rows || []);
    });
  }
});

router.get("/labs", authenticate, (req, res) => {
  db.all("SELECT DISTINCT user_lab as lab FROM kunjungan WHERE user_lab != '' ORDER BY user_lab", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(rows || []);
  });
});

router.post("/", authenticate, [
  body('nama_guru').trim().notEmpty().withMessage('Nama guru harus diisi'),
  body('kelas_diajar').trim().notEmpty().withMessage('Kelas diajar harus diisi'),
  body('jam_mulai').trim().notEmpty().withMessage('Jam mulai harus diisi'),
  body('jam_selesai').trim().notEmpty().withMessage('Jam selesai harus diisi')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  const { nama_guru, kelas_diajar, jam_mulai, jam_selesai, tanggal } = req.body;

  const tanggalKunjung = tanggal ? tanggal : new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();

  db.run(
    "INSERT INTO kunjungan (nama_guru, kelas_diajar, jam_mulai, jam_selesai, tanggal, created_by, user_lab, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [nama_guru, kelas_diajar, jam_mulai, jam_selesai, tanggalKunjung, req.user.id, req.user.lab || '', now],
    function(err) {
      if (err) {
        return res.status(500).json({ error: "Database error", details: err.message });
      }

      const detail = JSON.stringify({ nama_guru, kelas_diajar, jam_mulai, jam_selesai, lab: req.user.lab || '' });
      const display = req.user.display_name || req.user.username;
      addNotification('kunjungan', `${display} menambahkan kunjungan`, detail);
      res.status(201).json({ success: true, id: this.lastID });
    }
  );
});

router.put("/:id", authenticate, [
  body('nama_guru').trim().notEmpty().withMessage('Nama guru harus diisi'),
  body('kelas_diajar').trim().notEmpty().withMessage('Kelas diajar harus diisi'),
  body('jam_mulai').trim().notEmpty().withMessage('Jam mulai harus diisi'),
  body('jam_selesai').trim().notEmpty().withMessage('Jam selesai harus diisi')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  const id = parseInt(req.params.id);
  const { nama_guru, kelas_diajar, jam_mulai, jam_selesai, tanggal } = req.body;

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