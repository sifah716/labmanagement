require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

// Import database and routes
const { initDatabase, closeDatabase } = require('./server/database/db');
const authRoutes = require('./server/routes/auth');
const barangRoutes = require('./server/routes/barang');
const kunjunganRoutes = require('./server/routes/kunjungan');
const peminjamanRoutes = require('./server/routes/peminjaman');
const statsRoutes = require('./server/routes/stats');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Initialize database
initDatabase();

// Routes
app.use('/auth', authRoutes); // /login, /logout, /me, /health, /debug/users
app.use('/barang', barangRoutes);
app.use('/kunjungan', kunjunganRoutes);
app.use('/peminjaman', peminjamanRoutes);
app.use('/stats', statsRoutes);

// For backward compatibility, mount auth routes at root level too
app.post("/login", authRoutes);
app.post("/logout", authRoutes);
app.get("/me", authRoutes);
app.get("/health", authRoutes);
app.get("/debug/users", authRoutes);

// ============ ERROR HANDLING ============
// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: "Internal server error",
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  closeDatabase().then(() => {
    process.exit(0);
  }).catch(() => {
    process.exit(1);
  });
});

// Start server
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log('=================================');
  console.log('Lab Management System');
  console.log('=================================');
  console.log(`Server running at http://${HOST}:${PORT}`);
  console.log('✓ Database initialized');
  console.log('✓ Routes loaded');
  console.log('✓ Ready to accept connections');
});
