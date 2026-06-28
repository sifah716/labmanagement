require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./server/swagger');

const { initDatabase, closeDatabase } = require('./server/database/db');
const authRoutes = require('./server/routes/auth');
const barangRoutes = require('./server/routes/barang');
const kunjunganRoutes = require('./server/routes/kunjungan');
const peminjamanRoutes = require('./server/routes/peminjaman');
const statsRoutes = require('./server/routes/stats');
const announcementsRoutes = require('./server/routes/announcements');
const usersRoutes = require('./server/routes/users');

const app = express();

app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "'unsafe-inline'"],
      "style-src": ["'self'", "https:", "'unsafe-inline'"],
      "font-src": ["'self'", "https://fonts.gstatic.com"],
      "connect-src": ["'self'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"]
    }
  }
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
  : ['http://localhost:3000', 'http://localhost:5173'];
app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get('/api-spec/json', (req, res) => res.json(swaggerSpec));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Lab Management API Docs',
  swaggerOptions: { url: '/api-spec/json' }
}));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Terlalu banyak percobaan login. Coba lagi dalam 15 menit." },
  standardHeaders: true,
  legacyHeaders: false
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

app.use('/auth/login', loginLimiter);
app.use('/auth', authRoutes);
app.use('/barang', barangRoutes);
app.use('/kunjungan', kunjunganRoutes);
app.use('/peminjaman', peminjamanRoutes);
app.use('/stats', statsRoutes);
app.use('/announcements', announcementsRoutes);
app.use('/users', usersRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: "Origin tidak diizinkan" });
  }
  console.error('Error:', err);
  res.status(err.status || 500).json({ 
    error: "Internal server error",
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  closeDatabase().then(() => {
    process.exit(0);
  }).catch(() => {
    process.exit(1);
  });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

initDatabase().then(() => {
  app.listen(PORT, HOST, () => {
    console.log('=================================');
    console.log('Lab Management System');
    console.log('=================================');
    console.log(`Server running at http://${HOST}:${PORT}`);
    console.log('✓ Database initialized');
    console.log('✓ Routes loaded');
    console.log('✓ Ready to accept connections');
  });
}).catch(err => {
  console.error('Failed to initialize database:', err.message || err);
  process.exit(1);
});
