
const bcrypt = require("bcrypt");
const path = require("path");
const fs = require("fs");

const isPostgres = !!process.env.DATABASE_URL;
const SALT_ROUNDS = 10;

function hashPassword(password) {
  return bcrypt.hashSync(password, SALT_ROUNDS);
}

function comparePassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

function isUniqueError(err) {
  if (!err) return false;
  if (err.message && err.message.includes('UNIQUE')) return true;
  if (err.code === '23505') return true;
  return false;
}

let db;
let pool;

if (isPostgres) {

  const { Pool } = require('pg');
  pool = new Pool({ connectionString: process.env.DATABASE_URL });

  db = {
    pool,
    run(sql, params = [], callback) {
      if (typeof params === 'function') { callback = params; params = []; }
      const isInsert = /^\s*INSERT/i.test(sql);

      let idx = 0;
      const pgSql = sql.replace(/\?/g, () => `$${++idx}`);
      
      const query = isInsert ? pgSql + ' RETURNING id' : pgSql;

      pool.query(query, params)
        .then(result => {
          const ctx = {
            lastID: isInsert && result.rows.length > 0 ? result.rows[0].id : undefined,
            changes: result.rowCount
          };
          if (callback) callback.call(ctx, null);
        })
        .catch(err => {
          if (callback) callback(err);
          else console.error('DB run error:', err);
        });
    },

    get(sql, params = [], callback) {
      if (typeof params === 'function') { callback = params; params = []; }
      let idx = 0;
      const pgSql = sql.replace(/\?/g, () => `$${++idx}`);
      pool.query(pgSql, params)
        .then(result => callback(null, result.rows[0] || null))
        .catch(err => callback(err));
    },

    all(sql, params = [], callback) {
      if (typeof params === 'function') { callback = params; params = []; }
      let idx = 0;
      const pgSql = sql.replace(/\?/g, () => `$${++idx}`);
      pool.query(pgSql, params)
        .then(result => callback(null, result.rows))
        .catch(err => callback(err));
    },

    serialize(fn) { fn(); },

    close() { return pool.end(); }
  };

  console.log('✓ Connected to PostgreSQL database');

} else {

  const sqlite3 = require("sqlite3").verbose();

  const dataDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const logsDir = path.join(__dirname, '../../logs');
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

  const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/lab.db');
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) { console.error('Error opening database:', err.message); process.exit(1); }
    console.log('✓ Connected to SQLite database');
  });

  pool = null;
}

function initDatabase() {
  if (isPostgres) {
    initPostgres().catch(err => { console.error('PostgreSQL init error:', err); });
  } else {
    initSQLite();
  }
}

async function initPostgres() {

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'user',
      token TEXT,
      token_expires_at TIMESTAMP,
      display_name TEXT DEFAULT '',
      lab TEXT DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS barang (
      id SERIAL PRIMARY KEY,
      nama VARCHAR(255) NOT NULL,
      kode VARCHAR(255) UNIQUE NOT NULL,
      stok INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS kunjungan (
      id SERIAL PRIMARY KEY,
      nama_guru VARCHAR(255) NOT NULL,
      kelas_diajar VARCHAR(255) NOT NULL,
      jam_mulai VARCHAR(50) NOT NULL,
      jam_selesai VARCHAR(50) NOT NULL,
      tanggal VARCHAR(50) NOT NULL,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      user_lab TEXT DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS peminjaman (
      id SERIAL PRIMARY KEY,
      nama VARCHAR(255) NOT NULL,
      barang_id INTEGER NOT NULL REFERENCES barang(id) ON DELETE CASCADE,
      jumlah INTEGER NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'dipinjam' CHECK(status IN ('dipinjam', 'kembali')),
      waktu_pinjam TIMESTAMP NOT NULL DEFAULT NOW(),
      waktu_kembali TIMESTAMP,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      user_lab TEXT DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query("CREATE INDEX IF NOT EXISTS idx_peminjaman_status ON peminjaman(status)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_peminjaman_barang ON peminjaman(barang_id)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_kunjungan_tanggal ON kunjungan(tanggal)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_users_token ON users(token)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_peminjaman_created_by ON peminjaman(created_by)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_kunjungan_created_by ON kunjungan(created_by)");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reset_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(255) UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query("CREATE INDEX IF NOT EXISTS idx_reset_tokens_token ON reset_tokens(token)");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reset_requests (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      username VARCHAR(255) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      token TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMP
    )
  `);
  await pool.query("CREATE INDEX IF NOT EXISTS idx_reset_requests_status ON reset_requests(status)");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      type VARCHAR(50) NOT NULL,
      message TEXT NOT NULL,
      detail TEXT DEFAULT '',
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query("CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read)");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS announcements (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  const adminPassword = hashPassword('admin123');
  const userPassword = hashPassword('user123');
  const now = new Date().toISOString();

  try {
    await pool.query(
      "INSERT INTO users (username, password, role, display_name, lab, created_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password, display_name = EXCLUDED.display_name, lab = EXCLUDED.lab",
      ['admin', adminPassword, 'admin', 'Administrator', 'IT', now]
    );
    console.log('✓ Admin user ready (admin/admin123)');
  } catch (e) { console.error('Error creating admin:', e.message); }

  try {
    await pool.query(
      "INSERT INTO users (username, password, role, display_name, lab, created_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password, display_name = EXCLUDED.display_name, lab = EXCLUDED.lab",
      ['user', userPassword, 'user', 'User Lab', 'Lab Komputer', now]
    );
    console.log('✓ Regular user ready (user/user123)');
  } catch (e) { console.error('Error creating user:', e.message); }

  try {
    await pool.query(
      "INSERT INTO announcements (title, description, created_at, updated_at) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING",
      ["Selamat Datang di Sistem Manajemen Lab", "...", now, now]
    );
      } catch { /* ignore duplicate */ }

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

  for (const item of barangItems) {
    try {
      await pool.query(
        "INSERT INTO barang (nama, kode, stok, created_at, updated_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (kode) DO NOTHING",
        [item.nama, item.kode, item.stok, now, now]
      );
    } catch { /* ignore duplicate */ }
  }

  console.log('✓ PostgreSQL tables & seed data ready');
}

function initSQLite() {

  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      token TEXT,
      token_expires_at TEXT,
      display_name TEXT DEFAULT '',
      lab TEXT DEFAULT '',
      created_at TEXT NOT NULL
    )`);

    db.run("ALTER TABLE users ADD COLUMN token_expires_at TEXT", () => {});

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
      created_by INTEGER REFERENCES users(id),
      user_lab TEXT DEFAULT '',
      created_at TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS peminjaman (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL,
      barang_id INTEGER NOT NULL,
      jumlah INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'dipinjam' CHECK(status IN ('dipinjam', 'kembali')),
      waktu_pinjam TEXT NOT NULL,
      waktu_kembali TEXT,
      created_by INTEGER REFERENCES users(id),
      user_lab TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY(barang_id) REFERENCES barang(id) ON DELETE CASCADE
    )`);

    db.run("CREATE INDEX IF NOT EXISTS idx_peminjaman_status ON peminjaman(status)");
    db.run("CREATE INDEX IF NOT EXISTS idx_peminjaman_barang ON peminjaman(barang_id)");
    db.run("CREATE INDEX IF NOT EXISTS idx_peminjaman_created ON peminjaman(created_by)");
    db.run("CREATE INDEX IF NOT EXISTS idx_peminjaman_lab ON peminjaman(user_lab)");
    db.run("CREATE INDEX IF NOT EXISTS idx_kunjungan_tanggal ON kunjungan(tanggal)");
    db.run("CREATE INDEX IF NOT EXISTS idx_kunjungan_created ON kunjungan(created_by)");
    db.run("CREATE INDEX IF NOT EXISTS idx_kunjungan_lab ON kunjungan(user_lab)");
    db.run("CREATE INDEX IF NOT EXISTS idx_users_token ON users(token)");
    db.run("CREATE INDEX IF NOT EXISTS idx_barang_nama ON barang(nama)");
    db.run("CREATE INDEX IF NOT EXISTS idx_barang_kode ON barang(kode)");

    db.run(`CREATE TABLE IF NOT EXISTS reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);
    db.run("CREATE INDEX IF NOT EXISTS idx_reset_tokens_token ON reset_tokens(token)");

    db.run(`CREATE TABLE IF NOT EXISTS reset_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      token TEXT,
      created_at TEXT NOT NULL,
      expires_at TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);
    db.run("CREATE INDEX IF NOT EXISTS idx_reset_requests_status ON reset_requests(status)");

    db.run(`CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      detail TEXT DEFAULT '',
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )`);
    db.run("CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read)");

    db.run(`CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`);

    runMigrations();

    db.run("UPDATE users SET display_name='Administrator', lab='IT' WHERE username='admin' AND display_name=''");
    db.run("UPDATE users SET display_name='User Lab', lab='Lab Komputer' WHERE username='user' AND display_name=''");

    const adminPassword = hashPassword('admin123');
    const userPassword = hashPassword('user123');

    db.run("INSERT OR IGNORE INTO users (username, password, role, created_at) VALUES (?, ?, ?, ?)",
      ['admin', adminPassword, 'admin', new Date().toISOString()],
      function(err) { if (!err) console.log('✓ Admin user ready (admin/admin123)'); }
    );

    db.run("INSERT OR IGNORE INTO users (username, password, role, created_at) VALUES (?, ?, ?, ?)",
      ['user', userPassword, 'user', new Date().toISOString()],
      function(err) { if (!err) console.log('✓ Regular user ready (user/user123)'); }
    );

    const now = new Date().toISOString();
    db.run("INSERT OR IGNORE INTO announcements (title, description, created_at, updated_at) VALUES (?, ?, ?, ?)",
      ["Selamat Datang di Sistem Manajemen Lab", "...", now, now]
    );

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
    barangItems.forEach(item => {
      db.run("INSERT OR IGNORE INTO barang (nama, kode, stok, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        [item.nama, item.kode, item.stok, now, now]);
    });
  });
}

function closeDatabase() {
  return new Promise((resolve, reject) => {
    if (isPostgres && pool) {
      pool.end().then(() => {
        console.log('✓ PostgreSQL connection closed');
        resolve();
      }).catch(err => {
        console.error('Error closing PostgreSQL:', err.message);
        reject(err);
      });
    } else if (db && !isPostgres) {
      db.close((err) => {
        if (err) { console.error('Error closing database:', err.message); reject(err); }
        else { console.log('✓ Database connection closed'); resolve(); }
      });
    } else {
      resolve();
    }
  });
}

function addNotification(type, message, detail = '') {
  const now = new Date().toISOString();
  if (isPostgres) {
    pool.query(
      "INSERT INTO notifications (type, message, detail, created_at) VALUES ($1, $2, $3, $4)",
      [type, message, detail, now]
    ).catch(err => console.error('Notification error:', err));
  } else {
    db.run("INSERT INTO notifications (type, message, detail, created_at) VALUES (?, ?, ?, ?)",
      [type, message, detail, now]);
  }
}

function runMigrations() {
  const migDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migDir)) return;

  db.run(`CREATE TABLE IF NOT EXISTS _migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    applied_at TEXT NOT NULL
  )`);

  const files = fs.readdirSync(migDir).filter(f => f.endsWith('.sql')).sort();
  files.forEach(file => {
    db.get("SELECT id FROM _migrations WHERE name=?", [file], (err, row) => {
      if (err) return;
      if (row) return;
      const sql = fs.readFileSync(path.join(migDir, file), 'utf8');
      db.exec(sql, (execErr) => {
        if (execErr && !execErr.message.includes('duplicate column')) {
          console.error(`Migration ${file} error:`, execErr.message);
          return;
        }
        db.run("INSERT INTO _migrations (name, applied_at) VALUES (?, ?)", [file, new Date().toISOString()]);
        console.log(`✓ Migration applied: ${file}`);
      });
    });
  });
}

module.exports = {
  db,
  hashPassword,
  comparePassword,
  isUniqueError,
  initDatabase,
  closeDatabase,
  addNotification,
  isPostgres,
  pool
};
