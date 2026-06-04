// API Configuration - Auto-detect environment
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000'  // Development
  : window.location.origin;   // Production (same domain)

console.log('API URL:', API_URL);
