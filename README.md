# Lab Management System v2.2

Sistem manajemen laboratorium berbasis web untuk monitoring kunjungan guru, peminjaman peralatan, dan manajemen stok barang.

## Ringkasan

- Multi-level access: `user` dan `admin`
- Dashboard yang berbeda untuk User dan Admin
- Manajemen kunjungan, peminjaman, dan barang
- Ekspor data ke CSV dan fitur print laporan
- Sistem autentikasi token dengan role-based access control
- UI responsif untuk desktop dan mobile


## Fitur Utama

### Autentikasi & Akses
- Login dengan username/password
- Token-based authorization untuk endpoint API
- Role-based access control: User vs Admin

### Manajemen Kunjungan
- Tambah/edit kunjungan (User dan Admin)
- Hapus kunjungan (Admin saja)
- Filter dan pencarian data
- Validasi jam mulai dan jam selesai

### Manajemen Peminjaman
- Tambah peminjaman dengan validasi stok otomatis
- Tandai barang kembali/kembalikan
- Edit/hapus peminjaman (Admin saja)
- Lihat status peminjaman (Dipinjam/Kembali)
- Filter berdasarkan status

### Manajemen Barang (Admin Only)
- CRUD barang: Tambah, Edit, Hapus barang
- Validasi stok dan kode barang unik
- Highlight barang dengan stok rendah
- Update stok otomatis saat peminjaman

### Laporan & Statistik (Admin Only)
- Export data kunjungan ke CSV
- Export data peminjaman ke CSV
- Export data barang ke CSV
- Print laporan lengkap
- Dashboard statistik: total kunjungan, peminjaman, barang, stok rendah

## Instalasi

### Persyaratan
- Node.js v14+ 
- npm atau yarn

### Langkah
1. Masuk ke folder proyek
```bash
cd labmagement
```
2. Install dependencies
```bash
npm install
```
3. Jalankan server
```bash
npm start
```
4. Buka browser
```
http://localhost:3000/
```

## Akun Default

### Admin
- `admin`
- `admin123`
- Akses lengkap: kunjungan, peminjaman, barang, laporan

### User
- `user`
- `user123`
- Akses terbatas: lihat dashboard, tambah/edit kunjungan, tambah/kembali peminjaman

## API Singkat

### Autentikasi
- `POST /login` - Login dan dapatkan token
- `POST /logout` - Logout
- `GET /me` - Info user saat ini

### Barang (Admin)
- `GET /barang` - List barang
- `POST /barang` - Tambah barang
- `PUT /barang/:id` - Update barang
- `DELETE /barang/:id` - Hapus barang

### Kunjungan
- `GET /kunjungan` - List kunjungan
- `POST /kunjungan` - Tambah kunjungan
- `PUT /kunjungan/:id` - Edit kunjungan
- `DELETE /kunjungan/:id` - Delete kunjungan (Admin)

### Peminjaman
- `GET /peminjaman` - List peminjaman
- `POST /peminjaman` - Tambah peminjaman
- `PUT /peminjaman/:id` - Update status peminjaman
- `DELETE /peminjaman/:id` - Delete peminjaman (Admin)

## Struktur Proyek

```
labmagement/
├── config/                    # Konfigurasi aplikasi
│   └── config.js
├── data/                      # Database dan data persisten
│   └── lab.db
├── logs/                      # Folder log aplikasi
│   └── .gitkeep
├── public/                    # Frontend (Static files)
│   ├── pages/                 # HTML Pages (terorganisir per role)
│   │   ├── auth/              # Authentication pages
│   │   │   └── login.html     # Login page (publik)
│   │   ├── user/              # User Dashboard (regular user)
│   │   │   └── dashboard.html # Dashboard user biasa
│   │   └── admin/             # Admin Dashboard (admin only)
│   │       └── dashboard.html # Dashboard admin lengkap
│   ├── assets/                # Static assets
│   │   ├── css/
│   │   │   └── main.css       # Styling utama
│   │   ├── js/
│   │   │   ├── app.js         # Main application logic
│   │   │   └── config.js      # Konfigurasi frontend
│   │   └── images/            # Gambar dan icon
│   ├── manifest.json          # PWA manifest
│   └── service-worker.js      # PWA service worker
├── server/                    # Backend (API & Logic)
│   ├── database/              # Database layer
│   │   └── db.js              # SQLite setup & initialization
│   ├── middleware/            # Middleware
│   │   └── auth.js            # Authentication & authorization
│   └── routes/                # API endpoint handlers
│       ├── auth.js            # Login, logout, user info
│       ├── barang.js          # Manajemen barang (admin only)
│       ├── kunjungan.js       # Manajemen kunjungan
│       ├── peminjaman.js      # Manajemen peminjaman
│       └── stats.js           # Statistik dashboard
├── .env.example               # Template environment variables
├── .gitignore
├── package.json               # Dependencies & scripts
├── README.md                  # Dokumentasi ini
└── server.js                  # Entry point aplikasi
```

## Perbedaan Dashboard User vs Admin

### Dashboard User (`/pages/user/dashboard.html`)
**Akses untuk:** User biasa (non-admin)

**Fitur yang tersedia:**
- ✅ Statistik dasar (Total Kunjungan, Total Peminjaman, Peminjaman Aktif, Kunjungan Hari Ini)
- ✅ Manajemen Kunjungan (Tambah, Edit, Hapus sendiri)
- ✅ Manajemen Peminjaman (Tambah, Tandai kembali)
- ❌ Manajemen Barang (tidak ada akses)
- ❌ Laporan & Export (tidak ada akses)

### Dashboard Admin (`/pages/admin/dashboard.html`)
**Akses untuk:** Administrator

**Fitur yang tersedia:**
- ✅ Statistik lengkap (6 stat: Total Kunjungan, Peminjaman, Peminjaman Aktif, Total Barang, Stok Rendah, Kunjungan Hari Ini)
- ✅ Top 5 Barang Paling Sering Dipinjam (chart)
- ✅ Manajemen Kunjungan (CRUD lengkap)
- ✅ Manajemen Peminjaman (CRUD lengkap)
- ✅ Manajemen Barang (CRUD: Tambah, Edit, Hapus barang)
- ✅ Laporan & Export (Export CSV, Print laporan)

## Troubleshooting Singkat

### Server tidak jalan
- Pastikan Node.js sudah terinstall (cek: `node -v`)
- Jalankan `npm install` untuk install dependencies
- Jalankan `npm start` untuk menjalankan server
- Cek port di `.env` (default: 3000)

### Error "Cannot find module"
- Hapus folder `node_modules`
- Jalankan `npm install` ulang

### Database bermasalah atau ingin reset data
- Hapus file `data/lab.db`
- Restart server, database akan dibuat otomatis dengan data default

### Login tidak berhasil
- Gunakan akun default: `admin`/`admin123` atau `user`/`user123`
- Bersihkan browser cache: Buka DevTools (F12) → Application → Clear Storage → Clear site data
- Hapus localStorage: `localStorage.clear()` di console

### Asset tidak dimuat (CSS/JS error)
- Pastikan file ada di folder `public/assets/`
- Cek console browser untuk error message
- Restart server jika menambah file asset baru


## Arsitektur Backend Modular

Backend dibangun dengan arsitektur modular untuk mudah dikembangkan dan dipelihara:

### Database (`/server/database/db.js`)
- Menghubungkan ke SQLite database
- Membuat tabel otomatis: `users`, `kunjungan`, `barang`, `peminjaman`
- Mengisi data default: admin dan user akun
- Fungsi helper untuk query database

### Middleware (`/server/middleware/auth.js`)
- **`authenticate()`** - Verifikasi token JWT dari request header
- **`requireAdmin()`** - Middleware untuk proteksi endpoint admin-only
- Memberikan response 401/403 jika user tidak authorized

### Routes (`/server/routes/`)

**auth.js**
- `POST /login` → Autentikasi user, return token JWT
- `POST /logout` → Invalidate token
- `GET /me` → Ambil info user saat ini

**barang.js** (Admin Only)
- `GET /barang` → List semua barang
- `POST /barang` → Tambah barang baru
- `PUT /barang/:id` → Update data barang
- `DELETE /barang/:id` → Hapus barang

**kunjungan.js** (User & Admin)
- `GET /kunjungan` → List kunjungan
- `POST /kunjungan` → Tambah kunjungan
- `PUT /kunjungan/:id` → Edit kunjungan
- `DELETE /kunjungan/:id` → Hapus kunjungan (admin only)

**peminjaman.js** (User & Admin)
- `GET /peminjaman` → List peminjaman
- `POST /peminjaman` → Tambah peminjaman (validasi stok)
- `PUT /peminjaman/:id` → Update status peminjaman
- `DELETE /peminjaman/:id` → Hapus peminjaman (admin only)

**stats.js** (Admin & User)
- `GET /stats` → Statistik dashboard (difilter sesuai role)

## Frontend Structure

### Pages Terorganisir per Role
File HTML dibagi dalam folder sesuai fungsi untuk memudahkan identifikasi:
- **`/pages/auth/`** - Halaman login (akses publik)
- **`/pages/user/`** - Dashboard untuk user regular
- **`/pages/admin/`** - Dashboard untuk admin (fitur lengkap)

### Assets
- **main.css** - Styling responsif untuk desktop & mobile
- **app.js** - Logic utama: fetch data dari API, render UI, handle events
- **config.js** - Konfigurasi: API_URL dan konstanta global

### PWA Features
- **manifest.json** - Metadata untuk installable app
- **service-worker.js** - Cache management untuk offline support
#