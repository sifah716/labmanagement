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
    `${currentUser.role === 'admin' ? '👑' : '👤'} ${currentUser.display_name || currentUser.username}`;
  
  // Show/hide menu based on role (check if elements exist first)
  if (currentUser.role === 'admin') {
    const btnBarang = document.getElementById('btnBarang');
    const btnLaporan = document.getElementById('btnLaporan');
    if (btnBarang) btnBarang.style.display = 'inline-block';
    if (btnLaporan) btnLaporan.style.display = 'inline-block';
  } else {
    const btnBarang = document.getElementById('btnBarang');
    const btnLaporan = document.getElementById('btnLaporan');
    if (btnBarang) btnBarang.style.display = 'none';
    if (btnLaporan) btnLaporan.style.display = 'none';
  }
  
  return true;
}

async function handleLogout() {
  if (!confirm('Yakin ingin logout?')) return;
  
  try {
    await fetchAPI('/auth/logout', { method: 'POST' });
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
  
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Gagal (${response.status})`);
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
  if (id === 'users') { loadUsers(); loadResetRequests(); }
  if (id === 'pengumuman') loadPengumuman();
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
      // User: Tampilkan pengumuman (slider) dan informasi
      try {
        const announcements = await fetchAPI('/announcements');
        let slidesHTML = '';
        let dotsHTML = '';
        
        if (announcements.length > 0) {
          announcements.forEach((ann, index) => {
            const updatedDate = new Date(ann.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            const isActive = index === 0 ? 'active' : '';
            slidesHTML += `
              <div class="slide ${isActive}">
                <div class="announcement-item">
                  <h4>${ann.title}</h4>
                  <p>${ann.description}</p>
                  <small>Terakhir diperbarui: ${updatedDate}</small>
                </div>
              </div>
            `;
            dotsHTML += `<button class="slider-dot ${isActive}" data-index="${index}" aria-label="Slide ${index + 1}"></button>`;
          });
        } else {
          slidesHTML = `
            <div class="slide active">
              <div class="announcement-item"><p>Tidak ada pengumuman saat ini</p></div>
            </div>
          `;
          dotsHTML = '';
        }
        
        document.getElementById('dashboard').innerHTML = `
          <h2>📋 Dashboard</h2>
          <div class="info-section">
            <div class="announcement-card">
              <h3>📢 Pengumuman</h3>
              <div class="announcement-slider" id="announcementSlider">
                <div class="slide-track">${slidesHTML}</div>
                ${dotsHTML ? `<div class="slider-dots">${dotsHTML}</div>` : ''}
                ${announcements.length > 1 ? `<div class="slide-counter" id="slideCounter">1 / ${announcements.length}</div>` : ''}
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

        if (announcements.length > 1) {
          startAnnouncementSlider();
        }
      } catch (error) {
        // Fallback jika gagal fetch announcements
        document.getElementById('dashboard').innerHTML = `
          <h2>📋 Dashboard</h2>
          <div class="info-section">
            <div class="announcement-card">
              <h3>📢 Pengumuman</h3>
              <div class="announcement-slider">
                <div class="slide-track">
                  <div class="slide active">
                    <div class="announcement-item">
                      <h4>Selamat Datang di Sistem Manajemen Lab</h4>
                      <p>Gunakan menu <strong>Kunjungan</strong> untuk mencatat kunjungan mengajar Anda di laboratorium.</p>
                      <p>Gunakan menu <strong>Peminjaman</strong> untuk meminjam peralatan laboratorium.</p>
                    </div>
                  </div>
                </div>
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
    }
    
    showLoading(false);
  } catch (error) {
    console.error('Error loading dashboard:', error);
    showNotification('Gagal memuat dashboard', 'error');
    showLoading(false);
  }
}

// ============ ANNOUNCEMENT SLIDER ============
let announcementSliderInterval = null;

function startAnnouncementSlider() {
  const slider = document.getElementById('announcementSlider');
  if (!slider) return;

  // Stop existing interval
  if (announcementSliderInterval) {
    clearInterval(announcementSliderInterval);
  }

  const slides = slider.querySelectorAll('.slide');
  const dots = slider.querySelectorAll('.slider-dot');
  const counter = slider.querySelector('.slide-counter');
  let current = 0;
  let isHovering = false;

  function goTo(index) {
    slides.forEach(s => s.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));
    slides[index].classList.add('active');
    if (dots[index]) dots[index].classList.add('active');
    if (counter) counter.textContent = `${index + 1} / ${slides.length}`;
    current = index;
  }

  function next() {
    goTo((current + 1) % slides.length);
  }

  // Click dots
  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      goTo(parseInt(dot.dataset.index));
    });
  });

  // Pause on hover
  slider.addEventListener('mouseenter', () => { isHovering = true; });
  slider.addEventListener('mouseleave', () => { isHovering = false; });

  // Auto play
  announcementSliderInterval = setInterval(() => {
    if (!isHovering) next();
  }, 4000);
}

// ============ KUNJUNGAN ============
async function loadKunjungan(search = '', userFilter = '', labFilter = '') {
  try {
    showLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (userFilter) params.set('created_by', userFilter);
    if (labFilter) params.set('user_lab', labFilter);
    const qs = params.toString();
    const url = qs ? `/kunjungan?${qs}` : '/kunjungan';
    allKunjungan = await fetchAPI(url);
    
    const isAdmin = currentUser.role === 'admin';
    const colspan = isAdmin ? 7 : 6;
    let html = "";
    if (allKunjungan.length === 0) {
      html = `<tr><td colspan="${colspan}" style="text-align: center; color: #7f8c8d;">Tidak ada data</td></tr>`;
    } else {
      allKunjungan.forEach(item => {
        html += `<tr>
          <td>${item.nama_guru}</td>
          <td>${item.kelas_diajar}</td>
          <td>${formatDate(item.tanggal)}</td>
          <td>${item.jam_mulai}</td>
          <td>${item.jam_selesai}</td>
          ${isAdmin ? `<td>${item.user_lab || item.display_name || '-'}</td>` : ''}
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
  const userFilter = document.getElementById('filterKunjunganUser')?.value || '';
  const labFilter = document.getElementById('filterKunjunganLab')?.value || '';
  loadKunjungan(search, userFilter, labFilter);
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
    showNotification(error.message || "Gagal menyimpan kunjungan", 'error');
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
    showNotification(error.message || "Gagal menghapus kunjungan", 'error');
    showLoading(false);
  }
}

// ============ PEMINJAMAN ============
async function loadPeminjaman(search = '', status = '', userFilter = '', labFilter = '') {
  try {
    showLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (userFilter) params.set('created_by', userFilter);
    if (labFilter) params.set('user_lab', labFilter);
    const qs = params.toString();
    const url = qs ? `/peminjaman?${qs}` : '/peminjaman';
    
    allPeminjaman = await fetchAPI(url);
    
    const isAdmin = currentUser.role === 'admin';
    const colspan = isAdmin ? 7 : 6;
    let html = "";
    if (allPeminjaman.length === 0) {
      html = `<tr><td colspan="${colspan}" style="text-align: center; color: #7f8c8d;">Tidak ada data</td></tr>`;
    } else {
      allPeminjaman.forEach(item => {
        html += `<tr>
          <td>${item.nama}</td>
          <td>${item.barang_nama}</td>
          <td>${formatDate(item.waktu_pinjam)}</td>
          <td>${item.jumlah}</td>
          <td><span class="status-badge ${item.status}">${item.status}</span></td>
          ${isAdmin ? `<td>${item.user_lab || item.display_name || '-'}</td>` : ''}
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
  const userFilter = document.getElementById('filterPeminjamanUser')?.value || '';
  const labFilter = document.getElementById('filterPeminjamanLab')?.value || '';
  loadPeminjaman(search, status, userFilter, labFilter);
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
    showNotification(error.message || "Gagal menambahkan peminjaman", 'error');
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
    showNotification(error.message || "Gagal mengembalikan barang", 'error');
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
      method: "PATCH",
      body: JSON.stringify({ nama })
    });
    showNotification("Peminjaman berhasil diupdate", 'success');
    loadPeminjaman();
  } catch (error) {
    console.error("Error updating peminjaman:", error);
    showNotification(error.message || "Gagal mengupdate peminjaman", 'error');
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
    showNotification(error.message || "Gagal menghapus peminjaman", 'error');
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
    showNotification(error.message || "Gagal menyimpan barang", 'error');
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
    showNotification(error.message || "Gagal menghapus barang", 'error');
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
    
    let csv = 'Nama Guru,Kelas Diajar,Tanggal,Jam Mulai,Jam Selesai\n';
    data.forEach(item => {
      csv += `"${item.nama_guru}","${item.kelas_diajar}","${formatDate(item.tanggal)}","${item.jam_mulai}","${item.jam_selesai}"\n`;
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
            <tr><td>${k.nama_guru}</td><td>${k.kelas_diajar}</td><td>${formatDate(k.tanggal)}</td></tr>
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

// ============ PENGUMUMAN (ANNOUNCEMENTS) ============
let allPengumuman = [];
let editingPengumumanId = null;

async function loadPengumuman() {
  try {
    showLoading(true);
    allPengumuman = await fetchAPI('/announcements');
    
    let html = "";
    if (allPengumuman.length === 0) {
      html = '<tr><td colspan="4" style="text-align: center; color: #7f8c8d;">Tidak ada pengumuman</td></tr>';
    } else {
      allPengumuman.forEach(item => {
        const deskripsi = item.description.substring(0, 60) + (item.description.length > 60 ? '...' : '');
        html += `<tr>
          <td>${item.title}</td>
          <td>${deskripsi}</td>
          <td>${formatDateTime(item.updated_at)}</td>
          <td>
            <button onclick="editPengumuman(${item.id})" class="btn-primary">✏️ Edit</button>
            <button onclick="hapusPengumuman(${item.id})" class="btn-delete">🗑️ Hapus</button>
          </td>
        </tr>`;
      });
    }
    document.getElementById("tablePengumuman").innerHTML = html;
    showLoading(false);
  } catch (error) {
    console.error("Error loading pengumuman:", error);
    showNotification("Gagal memuat pengumuman", 'error');
    showLoading(false);
  }
}

async function tambahPengumuman() {
  const judul = document.getElementById("judulPengumuman").value.trim();
  const deskripsi = document.getElementById("deskripsiPengumuman").value.trim();

  if (!judul || !deskripsi) {
    showNotification("Judul dan deskripsi harus diisi", 'error');
    return;
  }

  try {
    showLoading(true);
    
    if (editingPengumumanId) {
      // Update
      await fetchAPI("/announcements/" + editingPengumumanId, {
        method: "PUT",
        body: JSON.stringify({ title: judul, description: deskripsi })
      });
      showNotification("Pengumuman berhasil diupdate", 'success');
      cancelEditPengumuman();
    } else {
      // Create
      await fetchAPI("/announcements", {
        method: "POST",
        body: JSON.stringify({ title: judul, description: deskripsi })
      });
      showNotification("Pengumuman berhasil ditambahkan", 'success');
    }
    
    document.getElementById("judulPengumuman").value = '';
    document.getElementById("deskripsiPengumuman").value = '';
    loadPengumuman();
  } catch (error) {
    console.error("Error saving pengumuman:", error);
    showNotification(error.message || "Gagal menyimpan pengumuman", 'error');
    showLoading(false);
  }
}

function editPengumuman(id) {
  const pengumuman = allPengumuman.find(p => p.id === id);
  if (!pengumuman) return;
  
  document.getElementById("judulPengumuman").value = pengumuman.title;
  document.getElementById("deskripsiPengumuman").value = pengumuman.description;
  
  editingPengumumanId = id;
  document.getElementById("btnSubmitPengumuman").textContent = "💾 Update";
  document.getElementById("btnCancelEditP").style.display = "inline-block";
  
  // Scroll to form
  document.querySelector("#pengumuman .form").scrollIntoView({ behavior: 'smooth' });
}

function cancelEditPengumuman() {
  editingPengumumanId = null;
  document.getElementById("judulPengumuman").value = '';
  document.getElementById("deskripsiPengumuman").value = '';
  document.getElementById("btnSubmitPengumuman").textContent = "➕ Tambah Pengumuman";
  document.getElementById("btnCancelEditP").style.display = "none";
}

async function hapusPengumuman(id) {
  if (!confirm("Yakin ingin menghapus pengumuman ini?")) return;
  
  try {
    showLoading(true);
    await fetchAPI("/announcements/" + id, { method: "DELETE" });
    showNotification("Pengumuman berhasil dihapus", 'success');
    loadPengumuman();
  } catch (error) {
    console.error("Error deleting pengumuman:", error);
    showNotification(error.message || "Gagal menghapus pengumuman", 'error');
    showLoading(false);
  }
}

// ============ PROFILE MODAL ============
function showProfileModal() {
  const user = JSON.parse(localStorage.getItem('user'));
  document.getElementById('profileDisplayName').value = user.display_name || '';
  document.getElementById('profileLab').value = user.lab || '';
  document.getElementById('profileCurPassword').value = '';
  document.getElementById('profileNewPassword').value = '';
  document.getElementById('profileModal').style.display = 'flex';
}

function closeProfileModal() {
  document.getElementById('profileModal').style.display = 'none';
}

async function saveProfile() {
  const display_name = document.getElementById('profileDisplayName').value.trim();
  const lab = document.getElementById('profileLab').value.trim();
  const currentPassword = document.getElementById('profileCurPassword').value;
  const newPassword = document.getElementById('profileNewPassword').value;

  if (!display_name) {
    showNotification('Nama lengkap harus diisi', 'error');
    return;
  }

  if (newPassword && newPassword.length < 6) {
    showNotification('Password baru minimal 6 karakter', 'error');
    return;
  }

  if (newPassword && !currentPassword) {
    showNotification('Masukkan password saat ini untuk mengubah password', 'error');
    return;
  }

  try {
    showLoading(true);
    const body = { display_name, lab };
    if (newPassword) {
      body.current_password = currentPassword;
      body.new_password = newPassword;
    }
    const result = await fetchAPI('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(body)
    });
    
    // Update localStorage
    const user = JSON.parse(localStorage.getItem('user'));
    user.display_name = result.user.display_name || display_name;
    user.lab = result.user.lab || lab;
    localStorage.setItem('user', JSON.stringify(user));
    
    // Update header display
    document.getElementById('userDisplay').textContent = 
      `${user.role === 'admin' ? '👑' : '👤'} ${result.user.display_name || display_name}`;
    
    showNotification('Profil berhasil diperbarui', 'success');
    closeProfileModal();
    
    if (result.reLogin) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setTimeout(() => window.location.href = '/', 1500);
    }
  } catch (error) {
    showNotification(error.message || 'Gagal menyimpan profil', 'error');
  } finally {
    showLoading(false);
  }
}

// ============ USERS MANAGEMENT (Admin Only) ============
async function loadUsers(search = '') {
  try {
    showLoading(true);
    const url = search ? `/users?search=${encodeURIComponent(search)}` : '/users';
    const users = await fetchAPI(url);
    
    let html = "";
    if (users.length === 0) {
      html = '<tr><td colspan="6" style="text-align: center; color: #7f8c8d;">Tidak ada user</td></tr>';
    } else {
      users.forEach(u => {
        const createdDate = u.created_at ? new Date(u.created_at).toLocaleDateString('id-ID') : '-';
        html += `<tr>
          <td>${u.username}</td>
          <td>${u.display_name || '-'}</td>
          <td><span class="status-badge ${u.role}">${u.role}</span></td>
          <td>${u.lab || '-'}</td>
          <td>${createdDate}</td>
          <td>
            <button onclick="editUser(${u.id})" class="btn-primary">✏️ Edit</button>
            ${u.username !== 'admin' ? `<button onclick="hapusUser(${u.id})" class="btn-delete">🗑️ Hapus</button>` : ''}
          </td>
        </tr>`;
      });
    }
    document.getElementById('tableUsers').innerHTML = html;
    showLoading(false);
  } catch (error) {
    console.error('Error loading users:', error);
    showNotification('Gagal memuat data user', 'error');
    showLoading(false);
  }
}

function searchUser() {
  const search = document.getElementById('searchUser').value;
  loadUsers(search);
}

let editingUserId = null;

function cancelEditUser() {
  editingUserId = null;
  document.getElementById('userUsername').value = '';
  document.getElementById('userDisplayName').value = '';
  document.getElementById('userLab').value = '';
  document.getElementById('userRole').value = 'user';
  document.getElementById('userPassword').value = '';
  document.getElementById('btnSubmitUser').textContent = '➕ Tambah User';
  document.getElementById('btnCancelEditUser').style.display = 'none';
}

async function tambahUser() {
  const username = document.getElementById('userUsername').value.trim();
  const password = document.getElementById('userPassword').value;
  const display_name = document.getElementById('userDisplayName').value.trim();
  const lab = document.getElementById('userLab').value.trim();
  const role = document.getElementById('userRole').value;

  if (!username || !display_name) {
    showNotification('Username dan Nama Lengkap harus diisi', 'error');
    return;
  }

  try {
    showLoading(true);

    if (editingUserId) {
      const body = { display_name, lab, role };
      if (password) body.password = password;
      await fetchAPI('/users/' + editingUserId, {
        method: 'PUT',
        body: JSON.stringify(body)
      });
      showNotification('User berhasil diupdate', 'success');
      cancelEditUser();
    } else {
      if (!password || password.length < 6) {
        showNotification('Password minimal 6 karakter', 'error');
        showLoading(false);
        return;
      }
      await fetchAPI('/users', {
        method: 'POST',
        body: JSON.stringify({ username, password, display_name, lab, role })
      });
      showNotification('User berhasil ditambahkan', 'success');
    }

    document.getElementById('userUsername').value = '';
    document.getElementById('userPassword').value = '';
    document.getElementById('userDisplayName').value = '';
    document.getElementById('userLab').value = '';
    document.getElementById('userRole').value = 'user';
    loadUsers();
  } catch (error) {
    showNotification(error.message || 'Gagal menyimpan user', 'error');
  } finally {
    showLoading(false);
  }
}

async function editUser(id) {
  try {
    const users = await fetchAPI('/users');
    const user = users.find(u => u.id === id);
    if (!user) {
      showNotification('User tidak ditemukan', 'error');
      return;
    }

    editingUserId = id;
    document.getElementById('userUsername').value = user.username;
    document.getElementById('userDisplayName').value = user.display_name || '';
    document.getElementById('userLab').value = user.lab || '';
    document.getElementById('userRole').value = user.role;
    document.getElementById('userPassword').value = '';
    document.getElementById('userPassword').placeholder = 'Kosongkan jika tidak diganti';
    document.getElementById('btnSubmitUser').textContent = '✏️ Update User';
    document.getElementById('btnCancelEditUser').style.display = 'inline-block';
    document.getElementById('formUser').scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    showNotification('Gagal memuat data user', 'error');
  }
}

async function hapusUser(id) {
  if (!confirm('Yakin ingin menghapus user ini?')) return;

  try {
    showLoading(true);
    await fetchAPI('/users/' + id, { method: 'DELETE' });
    showNotification('User berhasil dihapus', 'success');
    loadUsers();
  } catch (error) {
    showNotification(error.message || 'Gagal menghapus user', 'error');
    showLoading(false);
  }
}

// ============ RESET REQUESTS (Admin) ============
async function loadResetRequests() {
  try {
    const requests = await fetchAPI('/auth/reset-requests');
    const pending = requests.filter(r => r.status === 'pending');

    // Update badge on nav
    const badge = document.getElementById('resetBadge');
    if (badge) {
      badge.textContent = pending.length;
      badge.style.display = pending.length > 0 ? 'inline-flex' : 'none';
    }

    // Update card
    const card = document.getElementById('resetRequestsCard');
    const tbody = document.getElementById('tableResetRequests');
    if (!card || !tbody) return;

    if (pending.length === 0) {
      card.style.display = 'none';
      return;
    }

    card.style.display = 'block';
    let html = '';
    pending.forEach(r => {
      const time = new Date(r.created_at).toLocaleString('id-ID');
      html += `<tr>
        <td><strong>${r.username}</strong></td>
        <td>${time}</td>
        <td>
          <button onclick="approveResetRequest(${r.id})" class="btn-primary" style="background:var(--success)">✓ Setujui</button>
          <button onclick="denyResetRequest(${r.id})" class="btn-delete">✕ Tolak</button>
        </td>
      </tr>`;
    });
    tbody.innerHTML = html;
  } catch (error) {
    console.error('Error loading reset requests:', error);
  }
}

async function approveResetRequest(id) {
  const password = prompt('Masukkan password baru untuk user (min 6 karakter):');
  if (!password) return;
  if (password.length < 6) { showNotification('Password minimal 6 karakter', 'error'); return; }
  if (!confirm(`Setel ulang password user ini menjadi "${password}"?`)) return;

  try {
    showLoading(true);
    await fetchAPI(`/auth/reset-requests/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ newPassword: password })
    });
    showNotification('Password berhasil direset', 'success');
    loadResetRequests();
  } catch (error) {
    showNotification(error.message || 'Gagal', 'error');
  } finally {
    showLoading(false);
  }
}

async function denyResetRequest(id) {
  if (!confirm('Tolak permintaan reset password ini?')) return;
  try {
    showLoading(true);
    await fetchAPI(`/auth/reset-requests/${id}/deny`, { method: 'POST' });
    showNotification('Permintaan ditolak', 'success');
    loadResetRequests();
  } catch (error) {
    showNotification(error.message || 'Gagal menolak request', 'error');
  } finally {
    showLoading(false);
  }
}

// ============ NOTIFICATIONS (Admin) ============
let notifOpen = false;

function toggleNotifications() {
  const dd = document.getElementById('notifDropdown');
  notifOpen = !notifOpen;
  
  if (notifOpen) {
    const userInfo = document.querySelector('.user-info');
    const rect = userInfo.getBoundingClientRect();
    dd.style.position = 'fixed';
    dd.style.top = (rect.bottom + 8) + 'px';
    dd.style.right = (window.innerWidth - rect.right) + 'px';
    dd.classList.add('show');
    loadNotifications();
    markNotifRead();
  } else {
    dd.classList.remove('show');
    dd.style.position = '';
    dd.style.top = '';
    dd.style.right = '';
  }
}

// Click outside to close
document.addEventListener('click', function(e) {
  if (notifOpen && !e.target.closest('#notifBtn')) {
    const dd = document.getElementById('notifDropdown');
    dd.classList.remove('show');
    dd.style.position = '';
    dd.style.top = '';
    dd.style.right = '';
    notifOpen = false;
  }
});

// Close on scroll
document.addEventListener('scroll', function() {
  if (notifOpen) {
    const dd = document.getElementById('notifDropdown');
    dd.classList.remove('show');
    dd.style.position = '';
    dd.style.top = '';
    dd.style.right = '';
    notifOpen = false;
  }
}, { passive: true });

async function loadNotifications() {
  try {
    const data = await fetchAPI('/auth/notifications');
    const badge = document.getElementById('notifBadge');
    badge.textContent = data.unread_count;
    badge.style.display = data.unread_count > 0 ? 'flex' : 'none';

    // Only update the list if the dropdown is open
    if (!notifOpen) return;

    const list = document.getElementById('notifList');
    if (!data.notifications || data.notifications.length === 0) {
      list.innerHTML = '<div class="notif-empty">Belum ada notifikasi</div>';
      return;
    }

    let html = '';
    data.notifications.forEach(n => {
      const time = timeAgo(n.created_at);
      const icon = n.type === 'kunjungan' ? '👩‍🏫' : n.type === 'peminjaman' ? '📦' : n.type === 'reset_request' ? '🔑' : '✅';
      const unreadCls = !n.is_read ? ' unread' : '';

      let detailHtml = '';
      if (n.detail) {
        try {
          const d = JSON.parse(n.detail);
          if (n.type === 'kunjungan') {
            detailHtml = `${d.nama_guru} — ${d.kelas_diajar} (${d.jam_mulai}–${d.jam_selesai})${d.lab ? ' · ' + d.lab : ''}`;
          } else if (n.type === 'peminjaman') {
            detailHtml = `${d.nama} — ${d.barang} × ${d.jumlah}${d.lab ? ' · ' + d.lab : ''}`;
          }
        } catch(e) { detailHtml = n.detail; }
      }

      html += `<div class="notif-item${unreadCls}">
        <div class="notif-item-icon">${icon}</div>
        <div class="notif-item-content">
          <div class="notif-item-msg">${n.message}</div>
          ${detailHtml ? `<div class="notif-item-detail">${detailHtml}</div>` : ''}
          <div class="notif-item-time">${time}</div>
        </div>
      </div>`;
    });
    list.innerHTML = html;
  } catch (error) {
    console.error('Error loading notifications:', error);
  }
}

function timeAgo(dateStr) {
  const now = Date.now();
  const d = new Date(dateStr).getTime();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'baru saja';
  if (mins < 60) return `${mins}m lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}j lalu`;
  const days = Math.floor(hours / 24);
  return `${days}h lalu`;
}

async function markNotifRead() {
  try {
    await fetchAPI('/auth/notifications/read', { method: 'POST' });
  } catch(e) {}
}

// ============ FILTER LOADERS ============
async function loadUserFilters() {
  try {
    const users = await fetchAPI('/users');
    const labs = await fetchAPI('/users/labs');

    const filterKunjunganUser = document.getElementById('filterKunjunganUser');
    const filterPeminjamanUser = document.getElementById('filterPeminjamanUser');
    const filterKunjunganLab = document.getElementById('filterKunjunganLab');
    const filterPeminjamanLab = document.getElementById('filterPeminjamanLab');

    function populateUserSelect(select) {
      if (!select) return;
      select.innerHTML = '<option value="">Semua User</option>';
      users.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.username;
        opt.textContent = u.display_name || u.username;
        select.appendChild(opt);
      });
    }

    function populateLabSelect(select) {
      if (!select) return;
      select.innerHTML = '<option value="">Semua Lab</option>';
      labs.forEach(l => {
        const opt = document.createElement('option');
        opt.value = l.lab;
        opt.textContent = l.lab;
        select.appendChild(opt);
      });
    }

    populateUserSelect(filterKunjunganUser);
    populateUserSelect(filterPeminjamanUser);
    populateLabSelect(filterKunjunganLab);
    populateLabSelect(filterPeminjamanLab);
  } catch (error) {
    console.error('Error loading filter options:', error);
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
  if (currentUser.role === 'admin') { loadUserFilters(); loadResetRequests(); loadNotifications(); setInterval(loadNotifications, 30000); }
});
