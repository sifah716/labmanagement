
const express = require('express');
const { db, addNotification } = require('../database/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get("/", authenticate, (req, res) => {
  const search = req.query.search || '';
  const status = req.query.status || '';
  const created_by = req.query.created_by || '';
  const user_lab = req.query.user_lab || '';

  let query = `
    SELECT p.*, b.nama as barang_nama, b.kode as barang_kode,
           u.display_name as display_name, u.lab as creator_lab
    FROM peminjaman p
    JOIN barang b ON p.barang_id = b.id
    LEFT JOIN users u ON p.created_by = u.id
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

  if (created_by) {
    query += " AND u.username = ?";
    params.push(created_by);
  }

  if (user_lab) {
    query += " AND p.user_lab = ?";
    params.push(user_lab);
  }

  query += " ORDER BY p.waktu_pinjam DESC";

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Database error", details: err.message });
    }
    res.json(rows || []);
  });
});

router.get("/labs", authenticate, (req, res) => {
  db.all("SELECT DISTINCT user_lab as lab FROM peminjaman WHERE user_lab != '' ORDER BY user_lab", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(rows || []);
  });
});

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
        INSERT INTO peminjaman (nama, barang_id, jumlah, status, waktu_pinjam, created_by, user_lab, created_at)
        VALUES (?, ?, ?, 'dipinjam', ?, ?, ?, ?)
      `, [nama, barang_id, jumlahInt, waktu_pinjam, req.user.id, req.user.lab || '', now], function(insertErr) {
        if (insertErr) {
          return res.status(500).json({ error: "Database error", details: insertErr.message });
        }

        const detail = JSON.stringify({ nama, barang: row.nama, jumlah: jumlahInt, lab: req.user.lab || '' });
        const display = req.user.display_name || req.user.username;
        addNotification('peminjaman', `${display} meminjam ${row.nama}`, detail);
        res.status(201).json({ success: true, id: this.lastID });
      });
    });
  });
});

router.put("/:id", authenticate, (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "ID tidak valid" });
  }

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

router.patch("/:id", authenticate, (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "ID tidak valid" });
  }

  const { nama, jumlah } = req.body;
  if (nama === undefined && jumlah === undefined) {
    return res.status(400).json({ error: "Tidak ada field yang diupdate" });
  }

  db.get("SELECT * FROM peminjaman WHERE id=?", [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: "Database error", details: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: "Peminjaman tidak ditemukan" });
    }

    const newNama = nama !== undefined ? nama : row.nama;
    const newJumlah = jumlah !== undefined ? parseInt(jumlah) : row.jumlah;
    const now = new Date().toISOString();
    let shouldUpdateStock = false;
    let stockDiff = 0;

    if (jumlah !== undefined && newJumlah !== row.jumlah) {
      if (row.status !== 'dipinjam') {
        return res.status(400).json({ error: "Tidak bisa mengubah jumlah barang yang sudah dikembalikan" });
      }
      stockDiff = newJumlah - row.jumlah;
      shouldUpdateStock = true;
    }

    function doUpdate() {
      let setClauses = [];
      let params = [];
      if (nama !== undefined && newNama !== row.nama) {
        setClauses.push("nama=?");
        params.push(newNama);
      }
      if (jumlah !== undefined && newJumlah !== row.jumlah) {
        setClauses.push("jumlah=?");
        params.push(newJumlah);
      }
      if (setClauses.length === 0) {
        return res.json({ success: true });
      }
      db.run(`UPDATE peminjaman SET ${setClauses.join(", ")} WHERE id=?`, [...params, id], (err5) => {
        if (err5) return res.status(500).json({ error: "Database error" });
        res.json({ success: true });
      });
    }

    if (shouldUpdateStock) {
      db.get("SELECT stok FROM barang WHERE id=?", [row.barang_id], (err2, barang) => {
        if (err2) return res.status(500).json({ error: "Database error" });
        if (barang.stok < stockDiff) {
          return res.status(400).json({ error: "Stok tidak cukup untuk perubahan jumlah" });
        }
        db.run("UPDATE barang SET stok = stok - ?, updated_at=? WHERE id=?", [stockDiff, now, row.barang_id], (err3) => {
          if (err3) return res.status(500).json({ error: "Database error" });
          doUpdate();
        });
      });
    } else {
      doUpdate();
    }
  });
});

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