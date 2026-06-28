document.addEventListener('DOMContentLoaded', () => {
  if (!checkAuth()) return;
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('tanggalK').value = today;
  document.getElementById('tanggalP').value = today;
  loadDashboard();
  loadBarangForSelect();
  if (currentUser.role === 'admin') {
    loadUserFilters();
    loadResetRequests();
    loadNotifications();
    setInterval(loadNotifications, 30000);
  }
});
