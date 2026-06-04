// Configuration file for Lab Management System

module.exports = {
  // Server Configuration
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0'
  },

  // Database Configuration
  database: {
    path: process.env.DB_PATH || './data/lab.db'
  },

  // Security Configuration
  security: {
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    sessionTimeout: process.env.SESSION_TIMEOUT || 3600000, // 1 hour in milliseconds
    bcryptRounds: 10
  },

  // Application Configuration
  app: {
    name: 'Lab Management System',
    version: '2.2.0',
    environment: process.env.NODE_ENV || 'development'
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    path: './logs'
  }
};
