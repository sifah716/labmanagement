let editingUserId = null;

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
            <button onclick="editUser(${u.id})" class="btn-primary">Edit</button>
            ${u.username !== 'admin' ? `<button onclick="hapusUser(${u.id})" class="btn-delete">Hapus</button>` : ''}
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
        method: 'PUT', body: JSON.stringify(body)
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
    document.getElementById('btnSubmitUser').textContent = 'Update User';
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

async function loadResetRequests() {
  try {
    const requests = await fetchAPI('/auth/reset-requests');
    const pending = requests.filter(r => r.status === 'pending');
    const badge = document.getElementById('resetBadge');
    if (badge) {
      badge.textContent = pending.length;
      badge.style.display = pending.length > 0 ? 'inline-flex' : 'none';
    }
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
          <button onclick="approveResetRequest(${r.id})" class="btn-primary" style="background:var(--success)">Setujui</button>
          <button onclick="denyResetRequest(${r.id})" class="btn-delete">Tolak</button>
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
      method: 'POST', body: JSON.stringify({ newPassword: password })
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
