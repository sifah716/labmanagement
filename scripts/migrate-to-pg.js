

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

if (!process.env.DATABASE_URL) {
  console.error("ERROR: DATABASE_URL belum diset.");
  console.error("Contoh: set DATABASE_URL=postgresql://user:pass@host:5432/labdb");
  console.error("Atau untuk Railway: DATABASE_URL akan otomatis ada.");
  process.exit(1);
}

const sqlite3 = require("sqlite3").verbose();
const sqlitePath = process.env.DB_PATH || path.join(__dirname, '../data/lab.db');

if (!fs.existsSync(sqlitePath)) {
  console.error(`ERROR: File SQLite tidak ditemukan di ${sqlitePath}`);
  console.error("Pastikan sudah ada database SQLite sebelum migrasi.");
  process.exit(1);
}

const sqliteDb = new sqlite3.Database(sqlitePath, sqlite3.OPEN_READONLY, (err) => {
  if (err) { console.error('Gagal buka SQLite:', err.message); process.exit(1); }
  console.log('✓ SQLite database terbuka (read-only)');
});

const { Pool } = require("pg");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function getAll(sqliteDb, sql, params = []) {
  return new Promise((resolve, reject) => {
    sqliteDb.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function pgQuery(sql, params = []) {
  return pool.query(sql, params);
}

async function migrate() {
  console.log('\n========================================');
  console.log('  MIGRASI SQLite → PostgreSQL');
  console.log('========================================\n');

  try {

    await pool.query('SELECT NOW()');
    console.log('✓ PostgreSQL terhubung');

    console.log('\n--- Membuat tabel di PostgreSQL ---');
    await createTables();
    console.log('✓ Tabel berhasil dibuat');

    console.log('\n--- Migrasi data ---');

    await migrateTable('users', 'id', `
      SELECT id, username, password, COALESCE(role,'user') as role, token,
             COALESCE(display_name,'') as display_name, COALESCE(lab,'') as lab,
             COALESCE(created_at, datetime('now')) as created_at
      FROM users
    `, `INSERT INTO users (id, username, password, role, token, display_name, lab, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          username=EXCLUDED.username, password=EXCLUDED.password, role=EXCLUDED.role,
          token=EXCLUDED.token, display_name=EXCLUDED.display_name, lab=EXCLUDED.lab,
          created_at=EXCLUDED.created_at`);

    await migrateTable('barang', 'id', `
      SELECT id, nama, kode, stok,
             COALESCE(created_at, datetime('now')) as created_at,
             COALESCE(updated_at, datetime('now')) as updated_at
      FROM barang
    `, `INSERT INTO barang (id, nama, kode, stok, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          nama=EXCLUDED.nama, kode=EXCLUDED.kode, stok=EXCLUDED.stok,
          created_at=EXCLUDED.created_at, updated_at=EXCLUDED.updated_at`);

    await migrateTable('kunjungan', 'id', `
      SELECT id, nama_guru, kelas_diajar, jam_mulai, jam_selesai, tanggal,
             created_by, COALESCE(user_lab,'') as user_lab,
             COALESCE(created_at, datetime('now')) as created_at
      FROM kunjungan
    `, `INSERT INTO kunjungan (id, nama_guru, kelas_diajar, jam_mulai, jam_selesai, tanggal, created_by, user_lab, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          nama_guru=EXCLUDED.nama_guru, kelas_diajar=EXCLUDED.kelas_diajar,
          jam_mulai=EXCLUDED.jam_mulai, jam_selesai=EXCLUDED.jam_selesai,
          tanggal=EXCLUDED.tanggal, created_by=EXCLUDED.created_by,
          user_lab=EXCLUDED.user_lab, created_at=EXCLUDED.created_at`);

    await migrateTable('peminjaman', 'id', `
      SELECT p.id, p.nama, p.barang_id, p.jumlah, p.status,
             COALESCE(p.waktu_pinjam, datetime('now')) as waktu_pinjam,
             p.waktu_kembali, p.created_by, COALESCE(p.user_lab,'') as user_lab,
             COALESCE(p.created_at, datetime('now')) as created_at
      FROM peminjaman p
    `, `INSERT INTO peminjaman (id, nama, barang_id, jumlah, status, waktu_pinjam, waktu_kembali, created_by, user_lab, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          nama=EXCLUDED.nama, barang_id=EXCLUDED.barang_id, jumlah=EXCLUDED.jumlah,
          status=EXCLUDED.status, waktu_pinjam=EXCLUDED.waktu_pinjam,
          waktu_kembali=EXCLUDED.waktu_kembali, created_by=EXCLUDED.created_by,
          user_lab=EXCLUDED.user_lab, created_at=EXCLUDED.created_at`);

    await migrateTable('reset_tokens', 'id', `SELECT * FROM reset_tokens`,
      `INSERT INTO reset_tokens (id, user_id, token, expires_at, used, created_at)
       VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`);

    await migrateTable('reset_requests', 'id', `SELECT * FROM reset_requests`,
      `INSERT INTO reset_requests (id, user_id, username, status, token, created_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING`);

    await migrateTable('announcements', 'id', `
      SELECT id, title, description,
             COALESCE(created_at, datetime('now')) as created_at,
             COALESCE(updated_at, datetime('now')) as updated_at
      FROM announcements
    `, `INSERT INTO announcements (id, title, description, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET
          title=EXCLUDED.title, description=EXCLUDED.description,
          created_at=EXCLUDED.created_at, updated_at=EXCLUDED.updated_at`);

    await migrateTable('notifications', 'id', `SELECT * FROM notifications`,
      `INSERT INTO notifications (id, type, message, detail, is_read, created_at)
       VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`);

    console.log('\n--- Reset sequence ---');
    await resetSequences();
    console.log('✓ Sequence direset');

    console.log('\n--- Verifikasi ---');
    await verify();

    console.log('\n========================================');
    console.log('  ✅ MIGRASI SELESAI!');
    console.log('========================================');
    console.log('\nSekarang kamu bisa deploy dengan env:');
    console.log('  DATABASE_URL = (PostgreSQL connection string)');
    console.log('\nRailway akan set DATABASE_URL otomatis setelah add PostgreSQL plugin.\n');

  } catch (err) {
    console.error('\n❌ Migrasi gagal:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    sqliteDb.close();
    await pool.end();
  }
}

async function createTables() {

  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'user',
      token TEXT,
      display_name TEXT DEFAULT '',
      lab TEXT DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS barang (
      id SERIAL PRIMARY KEY,
      nama VARCHAR(255) NOT NULL,
      kode VARCHAR(255) UNIQUE NOT NULL,
      stok INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS kunjungan (
      id SERIAL PRIMARY KEY,
      nama_guru VARCHAR(255) NOT NULL,
      kelas_diajar VARCHAR(255) NOT NULL,
      jam_mulai VARCHAR(50) NOT NULL,
      jam_selesai VARCHAR(50) NOT NULL,
      tanggal VARCHAR(50) NOT NULL,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      user_lab TEXT DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS peminjaman (
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
    )`,
    `CREATE INDEX IF NOT EXISTS idx_peminjaman_status ON peminjaman(status)`,
    `CREATE INDEX IF NOT EXISTS idx_peminjaman_barang ON peminjaman(barang_id)`,
    `CREATE INDEX IF NOT EXISTS idx_kunjungan_tanggal ON kunjungan(tanggal)`,
    `CREATE INDEX IF NOT EXISTS idx_users_token ON users(token)`,
    `CREATE TABLE IF NOT EXISTS reset_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(255) UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS reset_requests (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      username VARCHAR(255) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      token TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      type VARCHAR(50) NOT NULL,
      message TEXT NOT NULL,
      detail TEXT DEFAULT '',
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS announcements (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`
  ];

  for (const sql of tables) {
    try {
      await pool.query(sql);
    } catch (err) {

      if (!err.message.includes('already exists')) {
        throw err;
      }
    }
  }
}

async function migrateTable(tableName, idColumn, selectSql, insertSql) {
  const rows = await getAll(sqliteDb, selectSql);
  console.log(`  ${tableName}: ${rows.length} baris ditemukan`);

  if (rows.length === 0) return;

  let success = 0;
  let failed = 0;

  for (const row of rows) {
    try {

      const values = extractValues(row);
      await pool.query(insertSql, values);
      success++;
    } catch (err) {

      if (err.code === '23505') { success++; continue; }
      failed++;
      if (failed <= 3) {
        console.error(`    ✗ Gagal insert ${tableName} id=${row.id}: ${err.message}`);
      }
    }
  }

  console.log(`  ${tableName}: ${success} berhasil, ${failed} gagal`);
}

function extractValues(row) {

  return Object.values(row);
}

async function resetSequences() {
  const tables = ['users', 'barang', 'kunjungan', 'peminjaman', 'reset_tokens', 'reset_requests', 'notifications', 'announcements'];
  for (const table of tables) {
    try {
      await pool.query(`SELECT setval('${table}_id_seq', COALESCE((SELECT MAX(id) FROM ${table}), 0) + 1, false)`);
    } catch (e) {

    }
  }
}

async function verify() {
  const tables = ['users', 'barang', 'kunjungan', 'peminjaman', 'reset_tokens', 'reset_requests', 'notifications', 'announcements'];
  let totalSource = 0;
  let totalDest = 0;

  for (const table of tables) {
    const sourceRows = await getAll(sqliteDb, `SELECT COUNT(*) as count FROM ${table}`);
    const sourceCount = sourceRows[0].count;
    const destResult = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
    const destCount = parseInt(destResult.rows[0].count);

    totalSource += sourceCount;
    totalDest += destCount;

    const status = sourceCount === destCount ? '✓' : '✗';
    console.log(`  ${status} ${table}: SQLite=${sourceCount} → PostgreSQL=${destCount}`);
  }

  console.log(`\n  Total: SQLite=${totalSource} → PostgreSQL=${totalDest}`);
  if (totalSource === totalDest) {
    console.log('  ✅ Semua data berhasil dimigrasi!');
  } else {
    console.log('  ⚠️  Ada perbedaan jumlah data. Cek manual.');
  }
}

migrate();
