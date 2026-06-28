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
              `<button onclick="kembaliPeminjaman(${item.id})" class="btn-primary">Kembali</button>` :
              ''}
            ${isAdmin && item.status === 'dipinjam' ? `<button onclick="editPeminjaman(${item.id})" class="btn-primary">Edit</button>` : ''}
            ${isAdmin ? `<button onclick="hapusPeminjaman(${item.id})" class="btn-delete">Hapus</button>` : ''}
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
      body: JSON.stringify({ nama, barang_id: parseInt(barangId), jumlah: jumlahInt, tanggal })
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
  if (newNama === null) return;
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
