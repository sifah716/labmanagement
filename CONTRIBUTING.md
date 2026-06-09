# Panduan Kontribusi - Lab Management System

Terima kasih sudah tertarik berkontribusi! Dokumen ini menjelaskan bagaimana Anda bisa membantu mengembangkan proyek ini.

## Cara Berkontribusi

### Melaporkan Bug

Jika Anda menemukan bug, ikuti langkah berikut:

1. **Cek Issue yang sudah ada** di [Issues](../../issues) agar tidak duplikat
2. **Buat Issue baru** jika belum ada dengan informasi:
   - **Judul**: Deskripsi singkat bug (contoh: "Login gagal dengan username khusus")
   - **Deskripsi**: Penjelasan detail tentang bug
   - **Langkah Reproduksi**: Step-by-step cara mereproduksi bug
     ```
     1. Login dengan akun user
     2. Klik menu Barang
     3. Bug terjadi: ...
     ```
   - **Perilaku Diharapkan**: Apa yang seharusnya terjadi
   - **Perilaku Aktual**: Apa yang benar-benar terjadi
   - **Screenshot/Video**: Jika memungkinkan, lampirkan bukti visual
   - **Lingkungan**: OS, Node.js version, browser

### Menyarankan Fitur Baru

Idea fitur baru sangat diterima! Silakan:

1. **Cek Issue yang sudah ada** untuk memastikan fitur belum disarankan
2. **Buat Issue baru** dengan template:
   - **Judul**: Nama fitur singkat (contoh: "Fitur Export Excel untuk Laporan")
   - **Deskripsi**: Penjelasan detail tentang fitur
   - **Use Cases**: Kapan dan mengapa fitur ini berguna
   - **Implementasi Yang Mungkin**: Ide teknis cara implementasinya (opsional)

### Pull Requests (Kontribusi Kode)

**Proses kontribusi kode:**

1. **Fork repository** ke akun GitHub Anda
   ```bash
   # Klik tombol "Fork" di halaman repository
   ```

2. **Clone fork Anda** ke komputer lokal
   ```bash
   git clone https://github.com/YOUR_USERNAME/labmanagement.git
   cd labmanagement
   ```

3. **Buat branch baru** dengan nama deskriptif
   ```bash
   # Format: feature/nama-fitur atau fix/nama-bug
   git checkout -b feature/tambah-export-excel
   # atau
   git checkout -b fix/login-gagal-email
   ```

4. **Buat perubahan** dengan mengikuti pedoman code style
   -  Ikuti gaya kode yang sudah ada
   -  Tambah komentar untuk logic kompleks
   -  Update dokumentasi jika ada API/fitur baru
   -  Test perubahan Anda secara menyeluruh
   -  Pastikan tidak ada console error

5. **Commit dengan pesan yang jelas** (Conventional Commits)
   ```bash
   git commit -m "Add: export laporan dalam format Excel"
   ```

   **Format commit message:**
   | Prefix | Gunakan Untuk | Contoh |
   |--------|---------------|--------|
   | `Add:` | Fitur baru | `Add: fitur filter barang berdasarkan kategori` |
   | `Fix:` | Bug fix | `Fix: login tidak berfungsi dengan email` |
   | `Update:` | Perubahan existing | `Update: improve UI dashboard` |
   | `Refactor:` | Refactoring code | `Refactor: reorganize auth middleware` |
   | `Docs:` | Dokumentasi | `Docs: update README instalasi` |
   | `Style:` | Format/spacing | `Style: fix indentation di app.js` |
   | `Test:` | Test-related | `Test: add unit test untuk login` |

6. **Push ke fork Anda**
   ```bash
   git push origin feature/tambah-export-excel
   ```

7. **Buat Pull Request** dengan template yang jelas
   - **Judul**: Ringkas perubahan (gunakan prefix yang sama seperti commit)
   - **Deskripsi**: Jelaskan apa yang diubah dan mengapa
   - **Link Issue**: Reference issue terkait (contoh: "Fixes #123")
   - **Screenshot**: Jika ada perubahan UI
   - **Checklist**:
     ```
     - [ ] Kode sudah ditest
     - [ ] Tidak ada console error
     - [ ] Dokumentasi sudah diupdate
     - [ ] Commit message mengikuti conventional commits
     ```

**Tips Pull Request yang Bagus:**
- Satu PR satu fitur/fix (jangan campur-campur)
- PR description yang detail membantu reviewer
- Respond to feedback dengan profesional
- Jangan push langsung ke main branch (selalu buat branch baru)

## Setup Development Environment

**Prerequisites:**
- Git sudah terinstall
- Node.js v16+ dan npm
- Code editor (VS Code recommended)
- Basic Git knowledge

### Setup Step-by-Step:

1. **Clone repository ke komputer Anda**
   ```bash
   git clone https://github.com/YOUR_USERNAME/labmanagement.git
   cd labmanagement
   ```

2. **Install semua dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   # Copy file template
   cp .env.example .env
   
   # Edit .env dengan text editor
   # FILE: .env
   PRIVATE_KEY=test_private_key_dev
   JWT_SECRET=test_jwt_secret_dev
   NODE_ENV=development
   PORT=3000
   ```

4. **Jalankan server di development mode**
   ```bash
   npm start
   ```

5. **Akses aplikasi**
   ```
   Browser: http://localhost:3000/pages/auth/login.html
   API: http://localhost:3000/api/
   ```

## Panduan Code Style

### JavaScript Conventions

```javascript
// ✅ BENAR
const userName = 'John';                  // const untuk immutable
let counter = 0;                          // let untuk mutable
const greet = (name) => `Hi ${name}`;     // Arrow function, template literal

/**
 * Menghitung total harga dengan pajak
 * @param {number} price - Harga barang
 * @param {number} tax - Persen pajak (default 10%)
 * @returns {number} Total harga
 */
const calculateTotal = (price, tax = 0.1) => {
  return price * (1 + tax);
};

// ❌ JANGAN
var userName = 'John';                    // Avoid var
function greet(name) {                    // Gunakan arrow function
  return 'Hi ' + name;                    // Gunakan template literal
}
```

**Rules:**
- Gunakan `const` by default, `let` jika perlu reassign, hindari `var`
- Gunakan arrow functions `() => {}`
- Gunakan template literals: `` `Hello ${name}` ``
- Add JSDoc comments untuk semua functions
- Keep functions small (max 20 lines)
- Meaningful variable names
- Comments untuk logic kompleks

### HTML Conventions

```html
<!-- ✅ BENAR -->
<section id="dashboard" class="page active" role="main">
  <article class="card">
    <h2>Data Kunjungan</h2>
    <table>
      <thead>
        <tr>
          <th scope="col">Nama</th>
          <th scope="col">Tanggal</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>John Doe</td>
          <td>2024-01-15</td>
        </tr>
      </tbody>
    </table>
  </article>
</section>

<!-- ❌ JANGAN -->
<div class="dashboard">
  <div class="card">
    <b>Data Kunjungan</b>
  </div>
</div>
```

**Rules:**
- Gunakan semantic HTML5: `<section>`, `<article>`, `<nav>`, `<header>`
- Indentation 2 spaces
- Add `role` attributes untuk accessibility
- `id` untuk unique elements, `class` untuk styling

### CSS/Styling

```css
/* ✅ BENAR */
.card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  transition: box-shadow 0.3s ease;
}

/* Responsive design */
@media (max-width: 768px) {
  .card {
    padding: 10px;
  }
}
```

## Testing Sebelum Submit PR

```bash
# 1. Manual testing
- Buka browser, test fitur yang diubah
- Test di mobile (F12 -> Device Emulation)
- Check console untuk error

# 2. Accessibility check
- Tab navigation berfungsi?
- Color contrast cukup?
```

## Code Review Process

Saat PR Anda di-review:

1. **Reviewer akan:**
   - Check code quality
   - Verify testing
   - Suggest improvements

2. **Anda akan:**
   - Respond to comments
   - Make requested changes
   - Mark conversations resolved

**Tips:**
- Jangan defensive terhadap feedback
- Ask for clarification jika tidak mengerti
- Thank reviewers untuk feedback

---

**Terima kasih sudah berkontribusi! 🚀**
