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

document.addEventListener('click', function(e) {
  if (notifOpen && !e.target.closest('#notifBtn')) {
    const dd = document.getElementById('notifDropdown');
    dd.classList.remove('show');
    dd.style.position = '';
    dd.style.top = '';
    dd.style.left = '';
    dd.style.transform = '';
    notifOpen = false;
  }
});

document.addEventListener('scroll', function() {
  if (notifOpen) {
    const dd = document.getElementById('notifDropdown');
    dd.classList.remove('show');
    dd.style.position = '';
    dd.style.top = '';
    dd.style.left = '';
    dd.style.transform = '';
    notifOpen = false;
  }
}, { passive: true });

async function loadNotifications() {
  try {
    const data = await fetchAPI('/auth/notifications');
    const badge = document.getElementById('notifBadge');
    badge.textContent = data.unread_count;
    badge.style.display = data.unread_count > 0 ? 'flex' : 'none';
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

function showProfileModal() {
  const user = JSON.parse(sessionStorage.getItem('user'));
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
      method: 'PUT', body: JSON.stringify(body)
    });
    const user = JSON.parse(sessionStorage.getItem('user'));
    user.display_name = result.user.display_name || display_name;
    user.lab = result.user.lab || lab;
    sessionStorage.setItem('user', JSON.stringify(user));
    document.getElementById('userDisplay').textContent =
      `${result.user.display_name || display_name}`;
    showNotification('Profil berhasil diperbarui', 'success');
    closeProfileModal();
    if (result.reLogin) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      setTimeout(() => window.location.href = '/', 1500);
    }
  } catch (error) {
    showNotification(error.message || 'Gagal menyimpan profil', 'error');
  } finally {
    showLoading(false);
  }
}
