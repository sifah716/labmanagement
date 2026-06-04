// ============ GLOBAL VARIABLES ============
// API_URL is defined in config.js
let currentUser = null;
let editingBarangId = null;
let editingKunjunganId = null;
let editingPeminjamanId = null;
let allKunjungan = [];
let allPeminjaman = [];
let allBarang = [];

// ============ AUTHENTICATION ============
function checkAuth() {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  
  if (!token || !userStr) {
    window.location.href = '/';
    return false;
  }
  
  currentUser = JSON.parse(userStr);
  document.getElementById('userDisplay').textContent = 
    `${currentUser.role === 'admin' ? '👑' : '👤'} ${currentUser.username}`;
  
  // Show/hide menu based on role
  if (currentUser.role === 'admin') {
    document.getElementById('btnBarang').style.display = 'inline-block';
    document.getElementById('btnLaporan').style.display = 'inline-block';
  } else {
    document.getElementById('btnBarang').style.display = 'none';
    document.getElementById('btnLaporan').style.display = 'none';
  }
  
  return true;
}

async function handleLogout() {
  if (!confirm('Yakin ingin logout?')) return;
  
  try {
    await fetchAPI('/logout', { method: 'POST' });
  } catch (error) {
    console.error('Logout error:', error);
  }
  
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/';
}

// ============ FETCH HELPER ============
async function fetchAPI(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token
    }
  };
  
  const response = await fetch(API_URL + endpoint, {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  });
  
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
    throw new Error('Unauthorized');
  }
  
  return response.json();
}

// ============ UTILITY FUNCTIONS ============
const formatDate = (iso) => {
  const date = new Date(iso);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const formatDateTime = (iso) => {
  const date = new Date(iso);
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 25px;
    border-radius: 8px;
    color: white;
    font-weight: bold;
    z-index: 10000;
    max-width: 400px;
    word-wrap: break-word;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    animation: slideIn 0.3s ease-out;
    background-color: ${type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#3498db'};
  `;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function showLoading(show = true) {
  document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
}

function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  
  // Load data when switching pages
  if (id === 'dashboard') loadDashboard();
  if (id === 'kunjungan') loadKunjungan();
  if (id === 'peminjaman') loadPeminjaman();
  if (id === 'barang') loadBarang();
}

// ============ DASHBOARD ============
async function loadDashboard() {
  try {
    showLoading(true);
    
    if (currentUser.role === 'admin') {
      // Admin: Tampilkan statistik
      const stats = await fetchAPI('/stats');
      
      document.getElementById('statTotalKunjungan').textContent = stats.totalKunjungan || 0;
      document.getElementById('statTotalPeminjaman').textContent = stats.totalPeminjaman || 0;
      document.getElementById('statPeminjamanAktif').textContent = stats.peminjamanAktif || 0;
      document.getElementById('statTotalBarang').textContent = stats.totalBarang || 0;
      document.getElementById('statStokRendah').textContent = stats.barangStokRendah || 0;
      document.getElementById('statKunjunganHariIni').textContent = stats.kunjunganHariIni || 0;
      
      // Display top barang
      const chartDiv = document.getElementById('topBarangChart');
      if (stats.topBarang && stats.topBarang.length > 0) {
        let html = '<div class="chart-bars">';
        const maxTotal = Math.max(...stats.topBarang.map(b => b.total));
        
        stats.topBarang.forEach(item => {
          const percentage = (item.total / maxTotal) * 100;
          html += `
            <div class="chart-bar-item">
              <div class="chart-label">${item.nama}</div>
              <div class="chart-bar-container">
                <div class="chart-bar" style="width: ${percentage}%"></div>
                <span class="chart-value">${item.total}x</span>
              </div>
            </div>
          `;
        });
        html += '</div>';
        chartDiv.innerHTML = html;
      } else {
        chartDiv.innerHTML = '<p style="text-align:center; color:#7f8c8d;">Belum ada data peminjaman</p>';
      }
    } else {
      // User: Tampilkan informasi/pengumuman
      document.getElementById('dashboard').innerHTML = `
        <h2>📋 Dashboard</h2>
        <div class="info-section">
          <div class="announcement-card">
            <h3>📢 Pengumuman</h3>
            <div class="announcement-item">
              <h4>Selamat Datang di Sistem Manajemen Lab</h4>
              <p>Gunakan menu <strong>Kunjungan</strong> untuk mencatat kunjungan mengajar Anda di laboratorium.</p>
              <p>Gunakan menu <strong>Peminjaman</strong> untuk meminjam peralatan laboratorium.</p>
              <small>Terakhir diperbarui: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</small>
            </div>
          </div>
          
          <div class="info-card">
            <h3>ℹ️ Informasi Penting</h3>
            <ul class="info-list">
              <li>✓ Pastikan mengisi form kunjungan setiap kali mengajar di lab</li>
              <li>✓ Peralatan yang dipinjam harus dikembalikan tepat waktu</li>
              <li>✓ Hubungi admin jika ada kendala atau pertanyaan</li>
              <li>✓ Jaga kebersihan dan keamanan laboratorium</li>
            </ul>
          </div>
          
          <div class="tips-card">
            <h3>💡 Tips Penggunaan</h3>
            <ul class="info-list">
              <li><strong>Kunjungan:</strong> Isi nama guru, kelas yang diajar, dan jam mulai-selesai</li>
              <li><strong>Peminjaman:</strong> Pilih barang yang tersedia dan tentukan jumlah</li>
              <li><strong>Pengembalian:</strong> Klik tombol "Kembali" setelah selesai menggunakan</li>
            </ul>
          </div>
        </div>
      `;
    }
    
    showLoading(false);
  } catch (error) {
    console.error('Error loading dashboard:', error);
    showNotification('Gagal memuat dashboard', 'error');
    showLoading(false);
  }
}

// ============ KUNJUNGAN ============
async function loadKunjungan(search = '') {
  try {
    showLoading(true);
    const url = search ? `/kunjungan?search=${encodeURIComponent(search)}` : '/kunjungan';
    allKunjungan = await fetchAPI(url);
    
    let html = "";
    if (allKunjungan.length === 0) {
      html = '<tr><td colspan="6" style="text-align: center; color: #7f8c8d;">Tidak ada data</td></tr>';
    } else {
      allKunjungan.forEach(item => {
        const isAdmin = currentUser.role === 'admin';
        html += `<tr>
          <td>${item.nama_guru}</td>
          <td>${item.kelas_diajar}</td>
          <td>${formatDate(item.tanggal)}</td>
          <td>${item.jam_mulai}</td>
          <td>${item.jam_selesai}</td>
          <td>
            <button onclick="editKunjungan(${item.id})" class="btn-primary">✏️ Edit</button>
            ${isAdmin ? `<button onclick="hapusKunjungan(${item.id})" class="btn-delete">🗑️ Hapus</button>` : ''}
          </td>
        </tr>`;
      });
    }
    document.getElementById("tableKunjungan").innerHTML = html;
    showLoading(false);
  } catch (error) {
    console.error("Error loading kunjungan:", error);
    showNotification("Gagal memuat data kunjungan", 'error');
    showLoading(false);
  }
}

function searchKunjungan() {
  const search = document.getElementById('searchKunjungan').value;
  loadKunjungan(search);
}

async function tambahKunjungan() {
  const nama_guru = document.getElementById("namaGuruK").value.trim();
  const kelas_diajar = document.getElementById("kelasDiajarK").value.trim();
  const jam_mulai = document.getElementById("jamMulaiK").value;
  const jam_selesai = document.getElementById("jamSelesaiK").value;
  const tanggal = document.getElementById("tanggalK").value;

  if (!nama_guru || !kelas_diajar || !jam_mulai || !jam_selesai) {
    showNotification("Semua field harus diisi", 'error');
    return;
  }

  try {
    showLoading(true);
    
    if (editingKunjunganId) {
      // Update
      await fetchAPI("/kunjungan/" + editingKunjunganId, {
        method: "PUT",
        body: JSON.stringify({ nama_guru, kelas_diajar, jam_mulai, jam_selesai, tanggal })
      });
      showNotification("Kunjungan berhasil diupdate", 'success');
      cancelEditKunjungan();
    } else {
      // Create
      await fetchAPI("/kunjungan", {
        method: "POST",
        body: JSON.stringify({ nama_guru, kelas_diajar, jam_mulai, jam_selesai, tanggal })
      });
      showNotification("Kunjungan berhasil ditambahkan", 'success');
    }
    
    document.getElementById("namaGuruK").value = '';
    document.getElementById("kelasDiajarK").value = '';
    document.getElementById("jamMulaiK").value = '';
    document.getElementById("jamSelesaiK").value = '';
    document.getElementById("tanggalK").value = '';
    loadKunjungan();
  } catch (error) {
    console.error("Error saving kunjungan:", error);
    showNotification(error.error || "Gagal menyimpan kunjungan", 'error');
    showLoading(false);
  }
}

function editKunjungan(id) {
  const kunjungan = allKunjungan.find(k => k.id === id);
  if (!kunjungan) return;
  
  document.getElementById("namaGuruK").value = kunjungan.nama_guru;
  document.getElementById("kelasDiajarK").value = kunjungan.kelas_diajar;
  document.getElementById("jamMulaiK").value = kunjungan.jam_mulai;
  document.getElementById("jamSelesaiK").value = kunjungan.jam_selesai;
  document.getElementById("tanggalK").value = kunjungan.tanggal;
  
  editingKunjunganId = id;
  document.getElementById("btnSubmitKunjungan").textContent = "💾 Update";
  document.getElementById("btnCancelEditK").style.display = "inline-block";
  
  // Scroll to form
  document.querySelector("#kunjungan .form").scrollIntoView({ behavior: 'smooth' });
}

function cancelEditKunjungan() {
  editingKunjunganId = null;
  document.getElementById("namaGuruK").value = '';
  document.getElementById("kelasDiajarK").value = '';
  document.getElementById("jamMulaiK").value = '';
  document.getElementById("jamSelesaiK").value = '';
  document.getElementById("tanggalK").value = '';
  document.getElementById("btnSubmitKunjungan").textContent = "➕ Tambah";
  document.getElementById("btnCancelEditK").style.display = "none";
}

async function hapusKunjungan(id) {
  if (!confirm("Yakin ingin menghapus data kunjungan ini?")) return;
  
  try {
    showLoading(true);
    await fetchAPI("/kunjungan/" + id, { method: "DELETE" });
    showNotification("Kunjungan berhasil dihapus", 'success');
    loadKunjungan();
  } catch (error) {
    console.error("Error deleting kunjungan:", error);
    showNotification(error.error || "Gagal menghapus kunjungan", 'error');
    showLoading(false);
  }
}

// ============ PEMINJAMAN ============
async function loadPeminjaman(search = '', status = '') {
  try {
    showLoading(true);
    let url = '/peminjaman?';
    if (search) url += `search=${encodeURIComponent(search)}&`;
    if (status) url += `status=${status}`;
    
    allPeminjaman = await fetchAPI(url);
    
    let html = "";
    if (allPeminjaman.length === 0) {
      html = '<tr><td colspan="6" style="text-align: center; color: #7f8c8d;">Tidak ada data</td></tr>';
    } else {
      const isAdmin = currentUser.role === 'admin';
      allPeminjaman.forEach(item => {
        html += `<tr>
          <td>${item.nama}</td>
          <td>${item.barang_nama}</td>
          <td>${formatDate(item.waktu_pinjam)}</td>
          <td>${item.jumlah}</td>
          <td><span class="status-badge ${item.status}">${item.status}</span></td>
          <td>
            ${item.status === 'dipinjam' ? 
              `<button onclick="kembaliPeminjaman(${item.id})" class="btn-primary">✓ Kembali</button>` : 
              ''}
            ${isAdmin && item.status === 'dipinjam' ? `<button onclick="editPeminjaman(${item.id})" class="btn-primary">✏️ Edit</button>` : ''}
            ${isAdmin ? `<button onclick="hapusPeminjaman(${item.id})" class="btn-delete">🗑️ Hapus</button>` : ''}
          </td>
        </tr>`;
      });
    }
    document.getElementById("tablePeminjaman").innerHTML = html;
    showLoading(false);
  } catch (error) {
    console.error("Error loading peminjaman:", error);
    showNotification("Gagal memuat data peminjaman", 'error');
    showLoading(false);
  }
}

function searchPeminjaman() {
  const search = document.getElementById('searchPeminjaman').value;
  const status = document.getElementById('filterStatus').value;
  loadPeminjaman(search, status);
}

async function loadBarangForSelect() {
  try {
    const data = await fetchAPI("/barang");
    const select = document.getElementById("barangP");
    select.innerHTML = '<option value="">Pilih Barang</option>';
    data.forEach(item => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = `${item.nama} (Stok: ${item.stok})`;
      if (item.stok === 0) {
        option.disabled = true;
        option.textContent += ' - Habis';
      }
      select.appendChild(option);
    });
  } catch (error) {
    console.error("Error loading barang:", error);
    showNotification("Gagal memuat data barang", 'error');
  }
}

async function tambahPeminjaman() {
  const nama = document.getElementById("namaP").value.trim();
  const barangId = document.getElementById("barangP").value;
  const jumlah = document.getElementById("jumlahP").value;
  const tanggal = document.getElementById("tanggalP").value;

  if (!nama || !barangId) {
    showNotification("Nama dan Barang harus diisi", 'error');
    return;
  }

  const jumlahInt = parseInt(jumlah);
  if (isNaN(jumlahInt) || jumlahInt <= 0) {
    showNotification("Jumlah harus lebih dari 0", 'error');
    return;
  }

  try {
    showLoading(true);
    await fetchAPI("/peminjaman", {
      method: "POST",
      body: JSON.stringify({
        nama,
        barang_id: parseInt(barangId),
        jumlah: jumlahInt,
        tanggal
      })
    });
    
    document.getElementById("namaP").value = '';
    document.getElementById("barangP").value = '';
    document.getElementById("jumlahP").value = '';
    document.getElementById("tanggalP").value = '';
    showNotification("Peminjaman berhasil ditambahkan", 'success');
    loadBarangForSelect();
    loadPeminjaman();
  } catch (error) {
    console.error("Error adding peminjaman:", error);
    showNotification(error.error || "Gagal menambahkan peminjaman", 'error');
    showLoading(false);
  }
}

async function kembaliPeminjaman(id) {
  if (!confirm("Tandai barang ini sudah dikembalikan?")) return;
  
  try {
    showLoading(true);
    await fetchAPI("/peminjaman/" + id, { method: "PUT" });
    showNotification("Barang berhasil dikembalikan", 'success');
    loadBarangForSelect();
    loadPeminjaman();
  } catch (error) {
    console.error("Error returning peminjaman:", error);
    showNotification(error.error || "Gagal mengembalikan barang", 'error');
    showLoading(false);
  }
}

function editPeminjaman(id) {
  const peminjaman = allPeminjaman.find(p => p.id === id);
  if (!peminjaman) return;
  
  const newNama = prompt("Edit Nama Peminjam:", peminjaman.nama);
  if (newNama === null) return; // User cancelled
  
  if (!newNama.trim()) {
    showNotification("Nama tidak boleh kosong", 'error');
    return;
  }
  
  updatePeminjaman(id, newNama.trim());
}

async function updatePeminjaman(id, nama) {
  try {
    showLoading(true);
    await fetchAPI("/peminjaman/" + id, {
      method: "PUT",
      body: JSON.stringify({ nama })
    });
    showNotification("Peminjaman berhasil diupdate", 'success');
    loadPeminjaman();
  } catch (error) {
    console.error("Error updating peminjaman:", error);
    showNotification(error.error || "Gagal mengupdate peminjaman", 'error');
    showLoading(false);
  }
}

async function hapusPeminjaman(id) {
  if (!confirm("Yakin ingin menghapus data peminjaman ini?")) return;
  
  try {
    showLoading(true);
    await fetchAPI("/peminjaman/" + id, { method: "DELETE" });
    showNotification("Peminjaman berhasil dihapus", 'success');
    loadBarangForSelect();
    loadPeminjaman();
  } catch (error) {
    console.error("Error deleting peminjaman:", error);
    showNotification(error.error || "Gagal menghapus peminjaman", 'error');
    showLoading(false);
  }
}

// ============ BARANG (ADMIN ONLY) ============
async function loadBarang(search = '') {
  try {
    showLoading(true);
    const url = search ? `/barang?search=${encodeURIComponent(search)}` : '/barang';
    allBarang = await fetchAPI(url);
    
    let html = "";
    if (allBarang.length === 0) {
      html = '<tr><td colspan="4" style="text-align: center; color: #7f8c8d;">Tidak ada data</td></tr>';
    } else {
      allBarang.forEach(item => {
        const stokClass = item.stok < 5 ? 'stok-rendah' : '';
        html += `<tr>
          <td>${item.nama}</td>
          <td>${item.kode}</td>
          <td class="${stokClass}">${item.stok}</td>
          <td>
            <button onclick="editBarang(${item.id})" class="btn-primary">✏️ Edit</button>
            <button onclick="hapusBarang(${item.id})" class="btn-delete">🗑️ Hapus</button>
          </td>
        </tr>`;
      });
    }
    document.getElementById("tableBarang").innerHTML = html;
    showLoading(false);
  } catch (error) {
    console.error("Error loading barang:", error);
    showNotification("Gagal memuat data barang", 'error');
    showLoading(false);
  }
}

function searchBarang() {
  const search = document.getElementById('searchBarang').value;
  loadBarang(search);
}

async function tambahBarang() {
  const nama = document.getElementById("namaBarang").value.trim();
  const kode = document.getElementById("kodeBarang").value.trim();
  const stok = document.getElementById("stokBarang").value;

  if (!nama || !kode || stok === '') {
    showNotification("Semua field harus diisi", 'error');
    return;
  }

  const stokInt = parseInt(stok);
  if (isNaN(stokInt) || stokInt < 0) {
    showNotification("Stok harus 0 atau lebih", 'error');
    return;
  }

  try {
    showLoading(true);
    
    if (editingBarangId) {
      // Update
      await fetchAPI("/barang/" + editingBarangId, {
        method: "PUT",
        body: JSON.stringify({ nama, kode, stok: stokInt })
      });
      showNotification("Barang berhasil diupdate", 'success');
      cancelEditBarang();
    } else {
      // Create
      await fetchAPI("/barang", {
        method: "POST",
        body: JSON.stringify({ nama, kode, stok: stokInt })
      });
      showNotification("Barang berhasil ditambahkan", 'success');
    }
    
    document.getElementById("namaBarang").value = '';
    document.getElementById("kodeBarang").value = '';
    document.getElementById("stokBarang").value = '';
    loadBarang();
    loadBarangForSelect();
  } catch (error) {
    console.error("Error saving barang:", error);
    showNotification(error.error || "Gagal menyimpan barang", 'error');
    showLoading(false);
  }
}

function editBarang(id) {
  const barang = allBarang.find(b => b.id === id);
  if (!barang) return;
  
  document.getElementById("namaBarang").value = barang.nama;
  document.getElementById("kodeBarang").value = barang.kode;
  document.getElementById("stokBarang").value = barang.stok;
  
  editingBarangId = id;
  document.getElementById("btnSubmitBarang").textContent = "💾 Update";
  document.getElementById("btnCancelEdit").style.display = "inline-block";
  
  // Scroll to form
  document.getElementById("formBarang").scrollIntoView({ behavior: 'smooth' });
}

function cancelEditBarang() {
  editingBarangId = null;
  document.getElementById("namaBarang").value = '';
  document.getElementById("kodeBarang").value = '';
  document.getElementById("stokBarang").value = '';
  document.getElementById("btnSubmitBarang").textContent = "➕ Tambah";
  document.getElementById("btnCancelEdit").style.display = "none";
}

async function hapusBarang(id) {
  if (!confirm("Yakin ingin menghapus barang ini?")) return;
  
  try {
    showLoading(true);
    await fetchAPI("/barang/" + id, { method: "DELETE" });
    showNotification("Barang berhasil dihapus", 'success');
    loadBarang();
    loadBarangForSelect();
  } catch (error) {
    console.error("Error deleting barang:", error);
    showNotification(error.error || "Gagal menghapus barang", 'error');
    showLoading(false);
  }
}

// ============ EXPORT & PRINT ============
function downloadCSV(filename, data) {
  const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

async function exportKunjungan() {
  try {
    showLoading(true);
    const data = await fetchAPI('/kunjungan');
    
    let csv = 'Nama,Kelas,Tanggal\n';
    data.forEach(item => {
      csv += `"${item.nama}","${item.kelas}","${formatDate(item.waktu)}"\n`;
    });
    
    downloadCSV('kunjungan.csv', csv);
    showNotification('Data kunjungan berhasil diexport', 'success');
    showLoading(false);
  } catch (error) {
    console.error('Export error:', error);
    showNotification('Gagal export data', 'error');
    showLoading(false);
  }
}

async function exportPeminjaman() {
  try {
    showLoading(true);
    const data = await fetchAPI('/peminjaman');
    
    let csv = 'Nama,Barang,Tanggal Pinjam,Jumlah,Status,Tanggal Kembali\n';
    data.forEach(item => {
      csv += `"${item.nama}","${item.barang_nama}","${formatDate(item.waktu_pinjam)}",${item.jumlah},"${item.status}","${item.waktu_kembali ? formatDate(item.waktu_kembali) : '-'}"\n`;
    });
    
    downloadCSV('peminjaman.csv', csv);
    showNotification('Data peminjaman berhasil diexport', 'success');
    showLoading(false);
  } catch (error) {
    console.error('Export error:', error);
    showNotification('Gagal export data', 'error');
    showLoading(false);
  }
}

async function exportBarang() {
  try {
    showLoading(true);
    const data = await fetchAPI('/barang');
    
    let csv = 'Nama,Kode,Stok\n';
    data.forEach(item => {
      csv += `"${item.nama}","${item.kode}",${item.stok}\n`;
    });
    
    downloadCSV('barang.csv', csv);
    showNotification('Data barang berhasil diexport', 'success');
    showLoading(false);
  } catch (error) {
    console.error('Export error:', error);
    showNotification('Gagal export data', 'error');
    showLoading(false);
  }
}

async function printReport() {
  try {
    showLoading(true);
    const stats = await fetchAPI('/stats');
    const kunjungan = await fetchAPI('/kunjungan');
    const peminjaman = await fetchAPI('/peminjaman');
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
      <head>
        <title>Laporan Lab Management System</title>
        <style>
          body { font-family: Arial; padding: 20px; }
          h1 { text-align: center; }
          .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
          .stat-box { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f0f0f0; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <h1>Laporan Lab Management System</h1>
        <p>Tanggal: ${new Date().toLocaleDateString('id-ID')}</p>
        
        <h2>Statistik</h2>
        <div class="stats">
          <div class="stat-box">Total Kunjungan: <strong>${stats.totalKunjungan}</strong></div>
          <div class="stat-box">Total Peminjaman: <strong>${stats.totalPeminjaman}</strong></div>
          <div class="stat-box">Peminjaman Aktif: <strong>${stats.peminjamanAktif}</strong></div>
        </div>
        
        <h2>Data Kunjungan Terbaru</h2>
        <table>
          <tr><th>Nama</th><th>Kelas</th><th>Tanggal</th></tr>
          ${kunjungan.slice(0, 10).map(k => `
            <tr><td>${k.nama}</td><td>${k.kelas}</td><td>${formatDate(k.waktu)}</td></tr>
          `).join('')}
        </table>
        
        <h2>Data Peminjaman Aktif</h2>
        <table>
          <tr><th>Nama</th><th>Barang</th><th>Tanggal</th><th>Jumlah</th><th>Status</th></tr>
          ${peminjaman.filter(p => p.status === 'dipinjam').map(p => `
            <tr><td>${p.nama}</td><td>${p.barang_nama}</td><td>${formatDate(p.waktu_pinjam)}</td><td>${p.jumlah}</td><td>${p.status}</td></tr>
          `).join('')}
        </table>
        
        <button onclick="window.print()">🖨️ Print</button>
      </body>
      </html>
    `);
    printWindow.document.close();
    showLoading(false);
  } catch (error) {
    console.error('Print error:', error);
    showNotification('Gagal membuat laporan', 'error');
    showLoading(false);
  }
}

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', () => {
  if (!checkAuth()) return;
  
  // Set today's date as default
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('tanggalK').value = today;
  document.getElementById('tanggalP').value = today;
  
  // Load initial data
  loadDashboard();
  loadBarangForSelect();
});
