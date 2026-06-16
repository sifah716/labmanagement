

module.exports = {

  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0'
  },

  database: {
    path: process.env.DB_PATH || './data/lab.db'
  },

  security: {
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    sessionTimeout: process.env.SESSION_TIMEOUT || 3600000,
    bcryptRounds: 10
  },

  app: {
    name: 'Lab Management System',
    version: '2.7.0',
    environment: process.env.NODE_ENV || 'development'
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    path: './logs'
  }
};
