#  Kebijakan Keamanan - Lab Management System

## Versi yang Didukung

| Versi | Status | Keterangan |
|-------|--------|-----------|
| 2.2.x | ✅ Aktif | Versi terbaru, fitur lengkap |
| 2.0.x | ✅ Aktif | Versi stabil, menerima patch keamanan |
| 1.0.x | ❌ Tidak Didukung | Sudah deprecated, upgrade ke v2+ |

## Melaporkan Vulnerability

Jika Anda menemukan kerentanan keamanan, **JANGAN** buat public issue. Ikuti prosedur ini:

### Langkah Melaporkan:

1. **Email ke:** sifah771166@gmail.com
2. **Subject line:** `[SECURITY] Lab Management System - Vulnerability Report`
3. **Konten email harus include:**
   - **Judul vulnerability**: Deskripsi singkat
   - **Tingkat severity**: Critical / High / Medium / Low
   - **Deskripsi detail**: Apa yang bermasalah dan mengapa berbahaya
   - **Langkah reproduksi**: Step-by-step cara mereproduksi vulnerability
   - **Dampak potensial**: Bagaimana attacker bisa memanfaatkannya
   - **Saran fix** (opsional): Ide cara memperbaikinya

### Response Time:
- **Target response:** Dalam 48 jam
- Kami akan koordinasi dengan Anda untuk fix
- Terima kasih atas laporan Anda!

---

## Praktik Keamanan Terbaik (Best Practices)

### Sebelum Deploy ke Production

#### Password & Credentials

```bash
# ❌ JANGAN - Default credentials
Username: admin
Password: admin123

# ✅ BENAR - Ubah password yang kuat
Username: admin_produksi_unik
Password: Hfl@9#mK2$pL8&xQ1vN (minimal 16 karakter)
```

**Rekomendasi password kuat:**
- Minimal 16 karakter
- Mix: Huruf besar, huruf kecil, angka, simbol
- Tidak berisi informasi personal
- Tidak berisi kata kamus

#### Environment Variables

```bash
# File: .env (JANGAN commit ke git!)
JWT_SECRET=kunci_rahasia_yang_sangat_panjang_dan_random
DATABASE_PATH=/secure/path/lab.db
NODE_ENV=production
PORT=3000

# File: .gitignore
.env           # Jangan pernah commit .env
.env.local
node_modules/
data/
```

**Catatan:** Gunakan `dotenv` package untuk load environment variables

#### HTTPS (SSL/TLS)

```bash
# ✅ Production harus HTTPS
https://yourdomain.com/

# ❌ HTTP tidak aman untuk production
http://yourdomain.com/  # Jangan gunakan ini!
```

**Setup HTTPS:**
1. Dapatkan SSL certificate (gratis: Let's Encrypt)
2. Config di nginx/Apache atau Node.js
3. Force redirect HTTP ke HTTPS

#### Database

```bash
# Regular Backups
- Backup harian ke storage secure
- Test restore backup secara berkala
- Simpan backup di lokasi terpisah dari server

# File Permissions
ls -la data/lab.db
# Output harus: -rw------- (600)
# Artinya: Hanya owner yang bisa read/write
```

#### Server & Dependencies

```bash
# Update Node.js ke LTS terbaru
node --version  # Pastikan v16+ atau v18+

# Update semua dependencies
npm audit
npm audit fix  # Fix security vulnerabilities
npm update     # Update ke versi terbaru
```

**Monitoring:**
- Setup alerts untuk suspicious activity
- Maintain regular backups
- Monitor security advisories
- Keep dependencies updated

---

## Kerentanan Keamanan yang Diketahui

### 1. Password Hashing

**Status:** SHA-256 (Development only)

```
❌ CURRENT: SHA-256 (tidak aman untuk production)
✅ RECOMMENDED: bcrypt atau Argon2
```

**Upgrade ke bcrypt:**

```bash
npm install bcrypt
```

```javascript
// Sebelum (tidak aman)
const hash = crypto.createHash('sha256').update(password).digest('hex');

// Sesudah (aman)
const bcrypt = require('bcrypt');
const hash = await bcrypt.hash(password, 10);
const isValid = await bcrypt.compare(password, hash);
```

### 2. Token Storage

**Status:** localStorage (basic security)

```
❌ CURRENT: localStorage (vulnerable to XSS)
✅ RECOMMENDED: httpOnly cookies
```

**Keuntungan httpOnly cookies:**
- JavaScript tidak bisa access (proteksi dari XSS)
- Browser otomatis kirim ke setiap request
- Lebih aman untuk sensitive data

### 3. Rate Limiting

**Status:** Not implemented

**Bahaya tanpa rate limiting:**
- Brute force attacks (coba password berkali-kali)
- DDoS attacks (flood server dengan requests)

**Implementasi:**

```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit');

// General limit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 menit
  max: 100                    // Max 100 requests
});

app.use('/api/', limiter);

// Stricter limit untuk login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5  // Max 5 login attempts per 15 menit
});

app.post('/login', loginLimiter, (req, res) => {
  // Handle login
});
```

### 4. CSRF Protection

**Status:** Not implemented

**Bahaya tanpa CSRF protection:**
- Attacker bisa manipulate user untuk trigger action
- Contoh: User terpaksa delete data tanpa tahu

**Implementasi:**

```bash
npm install csrf
```

---

## Security Checklist untuk Production

Sebelum go live, pastikan semua ini sudah done:

### Credentials & Access
- [✅] Ubah semua default passwords (admin, user)
- [✅] Set JWT_SECRET yang strong (32+ karakter random)
- [✅] Setup user management untuk team
- [✅] Restrict database access ke aplikasi saja

### Network & HTTPS
- [✅] Enable HTTPS dengan valid SSL certificate
- [✅] Configure firewall (hanya allow 80, 443)
- [✅] Disable unnecessary ports (block 3000)
- [✅] Setup DDoS protection

### Application Security
- [✅] Upgrade password hashing ke bcrypt
- [✅] Implement rate limiting untuk login
- [✅] Implement CSRF protection
- [✅] Configure CORS properly (whitelist domains)
- [✅] Input validation & sanitization
- [✅] Disable debug mode (NODE_ENV=production)

### Data & Backups
- [✅] Setup automated database backups (harian)
- [✅] Test restore dari backup
- [✅] Encrypt sensitive data di database
- [✅] Proper file permissions (600 untuk .env)

### Monitoring & Updates
- [✅] Setup error logging & monitoring
- [✅] Setup access logging
- [✅] Update Node.js ke LTS terbaru
- [✅] Run `npm audit` dan fix vulnerabilities
- [✅] Setup alerts untuk unusual activity
- [✅] Monitor security advisories

### Documentation
- [✅] Document security policies
- [✅] Create incident response plan
- [✅] Document access control & permissions
- [✅] Training untuk team tentang security

---

## Kontak Keamanan

**Untuk melaporkan security vulnerability:**
- 📧 Email: sifah771166@gmail.com
- 🏷️ Subject: `[SECURITY] Lab Management System - ...`
- ⏱️ Response time: Dalam 48 jam

**Untuk pertanyaan keamanan lainnya:**
- Buka discussion di repository
- Jangan share detail vulnerability di public
