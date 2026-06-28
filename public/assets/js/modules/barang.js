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
            <button onclick="editBarang(${item.id})" class="btn-primary">Edit</button>
            <button onclick="hapusBarang(${item.id})" class="btn-delete">Hapus</button>
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
      await fetchAPI("/barang/" + editingBarangId, {
        method: "PUT",
        body: JSON.stringify({ nama, kode, stok: stokInt })
      });
      showNotification("Barang berhasil diupdate", 'success');
      cancelEditBarang();
    } else {
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
