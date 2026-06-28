let currentUser = null;
let editingBarangId = null;
let editingKunjunganId = null;
let editingPeminjamanId = null;
let allKunjungan = [];
let allPeminjaman = [];
let allBarang = [];

function checkAuth() {
  const token = sessionStorage.getItem('token');
  const userStr = sessionStorage.getItem('user');
  if (!token || !userStr) {
    window.location.href = '/';
    return false;
  }
  currentUser = JSON.parse(userStr);
  document.getElementById('userDisplay').textContent =
    `${currentUser.display_name || currentUser.username}`;
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
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
  window.location.href = '/';
}

async function fetchAPI(endpoint, options = {}) {
  const token = sessionStorage.getItem('token');
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
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    window.location.href = '/';
    throw new Error('Unauthorized');
  }
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Gagal (${response.status})`);
  }
  return response.json();
}

const formatDate = (iso) => {
  const date = new Date(iso);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
};

const formatDateTime = (iso) => {
  const date = new Date(iso);
  return date.toLocaleString('id-ID', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed; top: 20px; right: 20px; padding: 15px 25px;
    border-radius: 8px; color: white; font-weight: bold; z-index: 10000;
    max-width: 400px; word-wrap: break-word;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15); animation: slideIn 0.3s ease-out;
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
  if (id === 'dashboard') loadDashboard();
  if (id === 'kunjungan') loadKunjungan();
  if (id === 'peminjaman') loadPeminjaman();
  if (id === 'barang') loadBarang();
  if (id === 'users') { loadUsers(); loadResetRequests(); }
  if (id === 'pengumuman') loadPengumuman();
}
