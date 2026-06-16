
const express = require('express');
const { db } = require('../database/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get("/", authenticate, (req, res) => {
  const stats = {};

  db.get("SELECT COUNT(*) as total FROM kunjungan", [], (err, row) => {
    if (err) return res.status(500).json({ error: "Database error" });
    stats.totalKunjungan = row.total;

    db.get("SELECT COUNT(*) as total FROM peminjaman", [], (err2, row2) => {
      if (err2) return res.status(500).json({ error: "Database error" });
      stats.totalPeminjaman = row2.total;

      db.get("SELECT COUNT(*) as total FROM peminjaman WHERE status='dipinjam'", [], (err3, row3) => {
        if (err3) return res.status(500).json({ error: "Database error" });
        stats.peminjamanAktif = row3.total;

        db.get("SELECT COUNT(*) as total FROM barang", [], (err4, row4) => {
          if (err4) return res.status(500).json({ error: "Database error" });
          stats.totalBarang = row4.total;

          db.get("SELECT COUNT(*) as total FROM barang WHERE stok < 5", [], (err5, row5) => {
            if (err5) return res.status(500).json({ error: "Database error" });
            stats.barangStokRendah = row5.total;

            const today = new Date().toISOString().split('T')[0];
            db.get(
              "SELECT COUNT(*) as total FROM kunjungan WHERE DATE(tanggal) = DATE(?)",
              [today],
              (err6, row6) => {
                if (err6) return res.status(500).json({ error: "Database error" });
                stats.kunjunganHariIni = row6.total;

                db.all(`
                  SELECT b.nama, COUNT(*) as total
                  FROM peminjaman p
                  JOIN barang b ON p.barang_id = b.id
                  GROUP BY b.id
                  ORDER BY total DESC
                  LIMIT 5
                `, [], (err7, rows7) => {
                  if (err7) return res.status(500).json({ error: "Database error" });
                  stats.topBarang = rows7;

                  res.json(stats);
                });
              }
            );
          });
        });
      });
    });
  });
});

module.exports = router;