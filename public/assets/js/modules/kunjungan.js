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
            <button onclick="editKunjungan(${item.id})" class="btn-primary">Edit</button>
            ${isAdmin ? `<button onclick="hapusKunjungan(${item.id})" class="btn-delete">Hapus</button>` : ''}
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
      await fetchAPI("/kunjungan/" + editingKunjunganId, {
        method: "PUT",
        body: JSON.stringify({ nama_guru, kelas_diajar, jam_mulai, jam_selesai, tanggal })
      });
      showNotification("Kunjungan berhasil diupdate", 'success');
      cancelEditKunjungan();
    } else {
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
