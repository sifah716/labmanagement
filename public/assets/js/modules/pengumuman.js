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
            <button onclick="editPengumuman(${item.id})" class="btn-primary">Edit</button>
            <button onclick="hapusPengumuman(${item.id})" class="btn-delete">Hapus</button>
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
      await fetchAPI("/announcements/" + editingPengumumanId, {
        method: "PUT",
        body: JSON.stringify({ title: judul, description: deskripsi })
      });
      showNotification("Pengumuman berhasil diupdate", 'success');
      cancelEditPengumuman();
    } else {
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
