// ============ PEMINJAMAN ROUTES ============
const express = require('express');
const { db } = require('../database/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /peminjaman - Get all peminjaman with optional search and status filter
router.get("/", authenticate, (req, res) => {
  const search = req.query.search || '';
  const status = req.query.status || '';

  let query = `
    SELECT p.*, b.nama as barang_nama, b.kode as barang_kode
    FROM peminjaman p
    JOIN barang b ON p.barang_id = b.id
    WHERE 1=1
  `;
  let params = [];

  if (search) {
    query += " AND (p.nama LIKE ? OR b.nama LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  if (status) {
    query += " AND p.status = ?";
    params.push(status);
  }

  query += " ORDER BY p.waktu_pinjam DESC";

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Database error", details: err.message });
    }
    res.json(rows || []);
  });
});

// POST /peminjaman - Create new peminjaman
router.post("/", authenticate, (req, res) => {
  const { nama, barang_id, jumlah, tanggal } = req.body;

  if (!nama || !barang_id || jumlah === undefined || jumlah === null) {
    return res.status(400).json({ error: "Field tidak lengkap" });
  }

  const jumlahInt = parseInt(jumlah);
  if (jumlahInt <= 0) {
    return res.status(400).json({ error: "Jumlah harus lebih dari 0" });
  }

  const waktu_pinjam = tanggal ? new Date(tanggal).toISOString() : new Date().toISOString();
  const now = new Date().toISOString();

  db.get("SELECT stok, nama FROM barang WHERE id=?", [barang_id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: "Database error", details: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: "Barang tidak ditemukan" });
    }
    if (row.stok < jumlahInt) {
      return res.status(400).json({
        error: `Stok ${row.nama} tidak cukup. Tersedia: ${row.stok}, Diminta: ${jumlahInt}`
      });
    }

    db.run("UPDATE barang SET stok = stok - ?, updated_at=? WHERE id=?", [jumlahInt, now, barang_id], (updateErr) => {
      if (updateErr) {
        return res.status(500).json({ error: "Database error", details: updateErr.message });
      }

      db.run(`
        INSERT INTO peminjaman (nama, barang_id, jumlah, status, waktu_pinjam, created_at)
        VALUES (?, ?, ?, 'dipinjam', ?, ?)
      `, [nama, barang_id, jumlahInt, waktu_pinjam, now], function(insertErr) {
        if (insertErr) {
          return res.status(500).json({ error: "Database error", details: insertErr.message });
        }
        res.status(201).json({ success: true, id: this.lastID });
      });
    });
  });
});

// PUT /peminjaman/:id - Update peminjaman (return or edit details)
router.put("/:id", authenticate, (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "ID tidak valid" });
  }

  const { nama, jumlah } = req.body;

  // If updating peminjaman details (for user edit)
  if (nama !== undefined || jumlah !== undefined) {
    db.get("SELECT * FROM peminjaman WHERE id=?", [id], (err, row) => {
      if (err) {
        return res.status(500).json({ error: "Database error", details: err.message });
      }
      if (!row) {
        return res.status(404).json({ error: "Peminjaman tidak ditemukan" });
      }

      const newNama = nama !== undefined ? nama : row.nama;
      const newJumlah = jumlah !== undefined ? parseInt(jumlah) : row.jumlah;

      // If jumlah changed, need to adjust stock
      if (newJumlah !== row.jumlah && row.status === 'dipinjam') {
        const diff = newJumlah - row.jumlah;
        const now = new Date().toISOString();

        db.get("SELECT stok FROM barang WHERE id=?", [row.barang_id], (err2, barang) => {
          if (err2) {
            return res.status(500).json({ error: "Database error" });
          }
          if (barang.stok < diff) {
            return res.status(400).json({ error: "Stok tidak cukup untuk perubahan jumlah" });
          }

          db.run("UPDATE barang SET stok = stok - ?, updated_at=? WHERE id=?", [diff, now, row.barang_id], (err3) => {
            if (err3) {
              return res.status(500).json({ error: "Database error" });
            }

            db.run("UPDATE peminjaman SET nama=?, jumlah=? WHERE id=?", [newNama, newJumlah, id], (err4) => {
              if (err4) {
                return res.status(500).json({ error: "Database error" });
              }
              res.json({ success: true });
            });
          });
        });
      } else {
        db.run("UPDATE peminjaman SET nama=? WHERE id=?", [newNama, id], (err5) => {
          if (err5) {
            return res.status(500).json({ error: "Database error" });
          }
          res.json({ success: true });
        });
      }
    });
    return;
  }

  // Original return functionality
  const now = new Date().toISOString();

  db.get("SELECT barang_id, jumlah, status FROM peminjaman WHERE id=?", [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: "Database error", details: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: "Peminjaman tidak ditemukan" });
    }
    if (row.status === 'kembali') {
      return res.status(400).json({ error: "Item sudah dikembalikan" });
    }

    db.run("UPDATE barang SET stok = stok + ?, updated_at=? WHERE id=?", [row.jumlah, now, row.barang_id], (updateErr) => {
      if (updateErr) {
        return res.status(500).json({ error: "Database error", details: updateErr.message });
      }

      db.run(`
        UPDATE peminjaman
        SET status='kembali', waktu_kembali=?
        WHERE id=?
      `, [now, id], (updateErr2) => {
        if (updateErr2) {
          return res.status(500).json({ error: "Database error", details: updateErr2.message });
        }
        res.json({ success: true });
      });
    });
  });
});

// DELETE /peminjaman/:id - Delete peminjaman (Admin only)
router.delete("/:id", authenticate, requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "ID tidak valid" });
  }

  db.get("SELECT barang_id, jumlah, status FROM peminjaman WHERE id=?", [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: "Database error", details: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: "Peminjaman tidak ditemukan" });
    }

    const now = new Date().toISOString();
    if (row.status === 'dipinjam') {
      db.run("UPDATE barang SET stok = stok + ?, updated_at=? WHERE id=?", [row.jumlah, now, row.barang_id], (updateErr) => {
        if (updateErr) {
          return res.status(500).json({ error: "Database error", details: updateErr.message });
        }

        db.run("DELETE FROM peminjaman WHERE id=?", [id], (deleteErr) => {
          if (deleteErr) {
            return res.status(500).json({ error: "Database error", details: deleteErr.message });
          }
          res.json({ success: true });
        });
      });
    } else {
      db.run("DELETE FROM peminjaman WHERE id=?", [id], (deleteErr) => {
        if (deleteErr) {
          return res.status(500).json({ error: "Database error", details: deleteErr.message });
        }
        res.json({ success: true });
      });
    }
  });
});

module.exports = router;