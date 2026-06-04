// ============ DATABASE CONNECTION & SETUP ============
const sqlite3 = require("sqlite3").verbose();
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Database connection
const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/lab.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('✓ Connected to SQLite database');
});

// Helper function untuk hash password
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Initialize database tables and seed data
function initDatabase() {
  db.serialize(() => {
    // Tabel users
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      token TEXT,
      created_at TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS barang (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL,
      kode TEXT UNIQUE NOT NULL,
      stok INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS kunjungan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama_guru TEXT NOT NULL,
      kelas_diajar TEXT NOT NULL,
      jam_mulai TEXT NOT NULL,
      jam_selesai TEXT NOT NULL,
      tanggal TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS peminjaman (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL,
      barang_id INTEGER NOT NULL,
      jumlah INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'dipinjam',
      waktu_pinjam TEXT NOT NULL,
      waktu_kembali TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(barang_id) REFERENCES barang(id)
    )`);

    // Seed default users
    const adminPassword = hashPassword('admin123');
    const userPassword = hashPassword('user123');

    db.run(
      "INSERT OR IGNORE INTO users (username, password, role, created_at) VALUES (?, ?, ?, ?)",
      ['admin', adminPassword, 'admin', new Date().toISOString()],
      function(err) {
        if (err) {
          console.error('Error creating admin user:', err.message);
        } else {
          console.log('✓ Admin user ready (admin/admin123)');
        }
      }
    );

    db.run(
      "INSERT OR IGNORE INTO users (username, password, role, created_at) VALUES (?, ?, ?, ?)",
      ['user', userPassword, 'user', new Date().toISOString()],
      function(err) {
        if (err) {
          console.error('Error creating user:', err.message);
        } else {
          console.log('✓ Regular user ready (user/user123)');
        }
      }
    );

    // Seed data untuk barang
    const barangItems = [
      { nama: "Camera", kode: "CAM001", stok: 5 },
      { nama: "Laptop", kode: "LAP001", stok: 8 },
      { nama: "Buku", kode: "BUK001", stok: 20 },
      { nama: "Penggaris", kode: "PEN001", stok: 15 },
      { nama: "Microscope", kode: "MIC001", stok: 3 },
      { nama: "Projector", kode: "PROJ001", stok: 2 },
      { nama: "Whiteboard", kode: "WB001", stok: 4 },
      { nama: "Pendrive", kode: "USB001", stok: 10 },
      { nama: "Mouse", kode: "MOU001", stok: 12 },
      { nama: "Keyboard", kode: "KEY001", stok: 10 }
    ];

    const now = new Date().toISOString();
    barangItems.forEach(item => {
      db.run(
        "INSERT OR IGNORE INTO barang (nama, kode, stok, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        [item.nama, item.kode, item.stok, now, now]
      );
    });
  });
}

// Graceful shutdown
function closeDatabase() {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
        reject(err);
      } else {
        console.log('✓ Database connection closed');
        resolve();
      }
    });
  });
}

module.exports = {
  db,
  hashPassword,
  initDatabase,
  closeDatabase
};