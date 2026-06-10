# Lab Management System v2.5

Sistem manajemen laboratorium berbasis web untuk monitoring kunjungan guru, peminjaman peralatan, manajemen user, dan stok barang.

## Ringkasan

- Multi-level access: `user` dan `admin`
- Dashboard berbeda untuk User dan Admin
- Manajemen kunjungan, peminjaman, barang, dan **user**
- Notifikasi aktivitas realtime (admin)
- Fitur lupa password dengan **persetujuan admin**
- Edit profil sendiri (nama, lab, password)
- Filter multi-lab & creator tracking
- Ekspor data ke CSV dan print laporan
- Autentikasi token dengan role-based access control
- UI responsif untuk desktop & mobile

## Fitur Utama

### Autentikasi & Profil
- Login dengan username/password
- Edit profil: Nama Lengkap, Lab, Ganti Password
- Lupa Password → request ke admin → admin approve & set password baru
- Token-based authorization + role-based access control

### Manajemen User (Admin Only)
- CRUD user: Tambah, Edit, Hapus user
- Set role (admin/user), lab, display name
- Lihat daftar permintaan reset password
- Setujui/tolak reset & langsung set password baru

### Notifikasi (Admin)
- 🔔 Bell icon dengan badge jumlah unread
- Notifikasi kunjungan, peminjaman, reset request
- Polling realtime tiap 30 detik

### Manajemen Kunjungan
- Tambah/edit kunjungan (User & Admin)
- Hapus kunjungan (Admin)
- Tracking siapa yang membuat (Dibuat Oleh)
- Filter by user & lab
- Pencarian data

### Manajemen Peminjaman
- Tambah peminjaman dengan validasi stok otomatis
- Tandai kembali, edit, hapus (Admin)
- Tracking siapa yang meminjam
- Filter by user, lab, status
- Pencarian data

### Manajemen Barang (Admin Only)
- CRUD barang: Tambah, Edit, Hapus
- Validasi stok dan kode barang unik
- Stok otomatis saat peminjaman/pengembalian
- Highlight stok rendah

### Laporan & Statistik (Admin Only)
- Export CSV: kunjungan, peminjaman, barang
- Print laporan
- Dashboard: total kunjungan, peminjaman, barang, stok rendah
- Top 5 barang paling sering dipinjam

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
- `admin` / `admin123`
- Display name: `Administrator`, Lab: `IT`
- Akses penuh ke semua fitur termasuk manajemen user & notifikasi

### User
- `user` / `user123`
- Display name: `User`, Lab: `Lab Komputer`
- Akses: dashboard, kunjungan, peminjaman, edit profil sendiri

## API Singkat

### Autentikasi
- `POST /auth/login` — Login dan dapatkan token
- `POST /auth/logout` — Logout
- `GET /auth/me` — Info user saat ini (termasuk display_name & lab)
- `PUT /auth/profile` — Edit profil & password sendiri
- `POST /auth/forgot-password` — Kirim request reset ke admin
- `POST /auth/reset-password` — Reset password dengan token

### Admin — Users
- `GET /users` — List semua user
- `POST /users` — Tambah user baru
- `PUT /users/:id` — Edit user
- `DELETE /users/:id` — Hapus user
- `GET /users/labs` — Daftar lab unik

### Admin — Reset Requests
- `GET /auth/reset-requests` — List semua request
- `POST /auth/reset-requests/:id/approve` — Setujui & set password baru
- `POST /auth/reset-requests/:id/deny` — Tolak request

### Admin — Notifications
- `GET /auth/notifications` — Ambil notifikasi
- `POST /auth/notifications/read` — Tandai semua sudah dibaca

### Barang (Admin)
- `GET /barang` — List barang
- `GET /barang/low-stock` — Barang stok rendah
- `POST /barang` — Tambah barang
- `PUT /barang/:id` — Update barang
- `DELETE /barang/:id` — Hapus barang

### Kunjungan
- `GET /kunjungan` — List (bisa filter: `search`, `created_by`, `user_lab`)
- `POST /kunjungan` — Tambah kunjungan (auto-simpan created_by & user_lab)
- `PUT /kunjungan/:id` — Edit kunjungan
- `DELETE /kunjungan/:id` — Hapus (Admin only)

### Peminjaman
- `GET /peminjaman` — List (bisa filter: `search`, `status`, `created_by`, `user_lab`)
- `POST /peminjaman` — Tambah peminjaman (auto-validasi stok)
- `PUT /peminjaman/:id` — Tandai kembali
- `PATCH /peminjaman/:id` — Edit nama/jumlah
- `DELETE /peminjaman/:id` — Hapus (Admin only)

### Stats
- `GET /stats` — Statistik dashboard

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
│   │   │   ├── forgot-password.html
│   │   │   └── reset-password.html
│   │   ├── user/              # User Dashboard (regular user)
│   │   │   └── dashboard.html
│   │   └── admin/             # Admin Dashboard (admin only)
│   │       └── dashboard.html
│   ├── assets/                # Static assets
│   │   ├── css/
│   │   │   └── main.css       # Styling utama
│   │   ├── js/
│   │   │   ├── app.js         # Main application logic
│   │   │   └── config.js      # Konfigurasi frontend
│   │   └── images/
│   ├── index.html             # Login page
│   ├── manifest.json          # PWA manifest
│   └── service-worker.js      # PWA service worker
├── server/                    # Backend (API & Logic)
│   ├── database/
│   │   └── db.js              # SQLite + init + seed
│   ├── middleware/
│   │   └── auth.js            # Authenticate & requireAdmin
│   └── routes/
│       ├── auth.js            # Login, logout, profile, forgot/reset, notifikasi
│       ├── barang.js          # CRUD barang
│       ├── kunjungan.js       # CRUD kunjungan
│       ├── peminjaman.js      # CRUD peminjaman
│       ├── stats.js           # Statistik dashboard
│       └── users.js           # CRUD users (admin only)
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
-  Statistik dasar (Total Kunjungan, Peminjaman, Peminjaman Aktif, Kunjungan Hari Ini)
-  Top 5 Barang Paling Sering Dipinjam
-  Kunjungan: Tambah, Edit, Hapus sendiri
-  Peminjaman: Tambah, Tandai kembali
-  Edit profil sendiri (nama, lab, ganti password)

### Dashboard Admin (`/pages/admin/dashboard.html`)
**Akses untuk:** Administrator

**Fitur yang tersedia:**
-  Statistik lengkap (6 kartu: Total Kunjungan, Peminjaman, Aktif, Barang, Stok Rendah, Kunjungan Hari Ini)
-  Top 5 Barang Paling Sering Dipinjam
-  Kunjungan: CRUD + filter by user & lab + lihat creator
-  Peminjaman: CRUD + filter by user, lab, status + lihat creator
-  Barang: CRUD lengkap
-  Users: CRUD user + set lab/role
-  Reset Password: Lihat permintaan, setujui/tolak, set password baru langsung
-  Notifikasi: Bell icon dengan realtime notif aktivitas
-  Laporan: Export CSV & Print

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
- SQLite database
- Tabel otomatis: `users`, `kunjungan`, `barang`, `peminjaman`, `reset_tokens`, `reset_requests`, `notifications`
- Migration kolom baru otomatis
- Fungsi helper: `hashPassword`, `addNotification`

### Middleware (`/server/middleware/auth.js`)
- **`authenticate()`** - Verifikasi token dari request header
- **`requireAdmin()`** - Proteksi endpoint admin-only
- Response 401/403 jika tidak authorized

### Routes (`/server/routes/`)

**auth.js**
- `POST /login` / `POST /logout` — Login/logout
- `GET /me` — Info user saat ini
- `PUT /profile` — Edit profil & password
- `POST /forgot-password` — Kirim request reset ke admin
- `POST /reset-password` — Reset dengan token
- `GET /reset-requests` + approve/deny — Admin manage reset
- `GET /notifications` + `POST /notifications/read` — Notifikasi

**users.js** (Admin Only)
- CRUD user + set role, display_name, lab
- `GET /users/labs` — Daftar lab unik

**barang.js** (Admin Only)
- CRUD barang + stok management

**kunjungan.js** (User & Admin)
- CRUD kunjungan + filter (search, created_by, user_lab)
- Auto-track creator & lab

**peminjaman.js** (User & Admin)
- CRUD peminjaman + validasi stok + pengembalian
- Filter (search, status, created_by, user_lab)
- Auto-track creator & lab

**stats.js**
- `GET /stats` — Statistik sesuai role

## Frontend Structure

### Pages Terorganisir per Role
- **`/pages/auth/`** — Forgot & reset password
- **`/pages/user/`** — Dashboard user
- **`/pages/admin/`** — Dashboard admin

### Assets
- **main.css** — Styling + modal, notifikasi, badges
- **app.js** — Fetch API, render UI, notifikasi polling, profil, user management
- **config.js** — API_URL & konstanta global

### PWA
- **manifest.json** — Installable app metadata
- **service-worker.js** — Cache management (v2.5)