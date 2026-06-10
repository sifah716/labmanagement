// API Configuration
// Frontend dan API dari server yang sama (Express), pakai relative URL
const API_URL = '';

// Untuk development local, bisa diubah jika frontend terpisah:
// const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';

console.log('API URL:', API_URL || '(relative)');
