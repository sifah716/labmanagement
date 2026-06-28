const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Lab Management System API',
      version: '2.7.0',
      description: 'API untuk Sistem Manajemen Laboratorium - Monitoring Kunjungan dan Peminjaman Barang',
    },
    servers: [
      { url: '/', description: 'Local server' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./server/routes/*.js'],
};

module.exports = swaggerJsdoc(options);
