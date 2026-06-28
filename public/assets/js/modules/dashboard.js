let announcementSliderInterval = null;

function downloadCSV(filename, data) {
  const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

async function loadDashboard() {
  try {
    showLoading(true);
    if (currentUser.role === 'admin') {
      const stats = await fetchAPI('/stats');
      document.getElementById('statTotalKunjungan').textContent = stats.totalKunjungan || 0;
      document.getElementById('statTotalPeminjaman').textContent = stats.totalPeminjaman || 0;
      document.getElementById('statPeminjamanAktif').textContent = stats.peminjamanAktif || 0;
      document.getElementById('statTotalBarang').textContent = stats.totalBarang || 0;
      document.getElementById('statStokRendah').textContent = stats.barangStokRendah || 0;
      document.getElementById('statKunjunganHariIni').textContent = stats.kunjunganHariIni || 0;
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
          <h2>Dashboard</h2>
          <div class="info-section">
            <div class="announcement-card">
              <h3>Pengumuman</h3>
              <div class="announcement-slider" id="announcementSlider">
                <div class="slide-track">${slidesHTML}</div>
                ${dotsHTML ? `<div class="slider-dots">${dotsHTML}</div>` : ''}
                ${announcements.length > 1 ? `<div class="slide-counter" id="slideCounter">1 / ${announcements.length}</div>` : ''}
              </div>
            </div>
            <div class="info-card">
              <h3>Informasi Penting</h3>
              <ul class="info-list">
                <li>Pastikan mengisi form kunjungan setiap kali mengajar di lab</li>
                <li>Peralatan yang dipinjam harus dikembalikan tepat waktu</li>
                <li>Hubungi admin jika ada kendala atau pertanyaan</li>
                <li>Jaga kebersihan dan keamanan laboratorium</li>
              </ul>
            </div>
            <div class="tips-card">
              <h3>Tips Penggunaan</h3>
              <ul class="info-list">
                <li><strong>Kunjungan:</strong> Isi nama guru, kelas yang diajar, dan jam mulai-selesai</li>
                <li><strong>Peminjaman:</strong> Pilih barang yang tersedia dan tentukan jumlah</li>
                <li><strong>Pengembalian:</strong> Klik tombol "Kembali" setelah selesai menggunakan</li>
              </ul>
            </div>
          </div>
        `;
        if (announcements.length > 1) startAnnouncementSlider();
      } catch (error) {
        document.getElementById('dashboard').innerHTML = `
          <h2>Dashboard</h2>
          <div class="info-section">
            <div class="announcement-card">
              <h3>Pengumuman</h3>
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
              <h3>Informasi Penting</h3>
              <ul class="info-list">
                <li>Pastikan mengisi form kunjungan setiap kali mengajar di lab</li>
                <li>Peralatan yang dipinjam harus dikembalikan tepat waktu</li>
                <li>Hubungi admin jika ada kendala atau pertanyaan</li>
                <li>Jaga kebersihan dan keamanan laboratorium</li>
              </ul>
            </div>
            <div class="tips-card">
              <h3>Tips Penggunaan</h3>
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

function startAnnouncementSlider() {
  const slider = document.getElementById('announcementSlider');
  if (!slider) return;
  if (announcementSliderInterval) clearInterval(announcementSliderInterval);
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
  function next() { goTo((current + 1) % slides.length); }
  dots.forEach(dot => {
    dot.addEventListener('click', () => { goTo(parseInt(dot.dataset.index)); });
  });
  slider.addEventListener('mouseenter', () => { isHovering = true; });
  slider.addEventListener('mouseleave', () => { isHovering = false; });
  announcementSliderInterval = setInterval(() => {
    if (!isHovering) next();
  }, 4000);
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
      <head><title>Laporan Lab Management System</title>
      <style>
        body { font-family: Arial; padding: 20px; }
        h1 { text-align: center; }
        .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
        .stat-box { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f0f0f0; }
        @media print { button { display: none; } }
      </style></head>
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
      </body></html>
    `);
    printWindow.document.close();
    showLoading(false);
  } catch (error) {
    console.error('Print error:', error);
    showNotification('Gagal membuat laporan', 'error');
    showLoading(false);
  }
}
