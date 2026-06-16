require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

const { initDatabase, closeDatabase } = require('./server/database/db');
const authRoutes = require('./server/routes/auth');
const barangRoutes = require('./server/routes/barang');
const kunjunganRoutes = require('./server/routes/kunjungan');
const peminjamanRoutes = require('./server/routes/peminjaman');
const statsRoutes = require('./server/routes/stats');
const announcementsRoutes = require('./server/routes/announcements');
const usersRoutes = require('./server/routes/users');

const app = express();

app.set('trust proxy', 1);
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

initDatabase();

app.use('/auth', authRoutes);
app.use('/barang', barangRoutes);
app.use('/kunjungan', kunjunganRoutes);
app.use('/peminjaman', peminjamanRoutes);
app.use('/stats', statsRoutes);
app.use('/announcements', announcementsRoutes);
app.use('/users', usersRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: "Internal server error",
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  closeDatabase().then(() => {
    process.exit(0);
  }).catch(() => {
    process.exit(1);
  });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log('=================================');
  console.log('Lab Management System');
  console.log('=================================');
  console.log(`Server running at http://${HOST}:${PORT}`);
  console.log('✓ Database initialized');
  console.log('✓ Routes loaded');
  console.log('✓ Ready to accept connections');
});
