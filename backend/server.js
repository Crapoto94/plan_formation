require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { setupDb } = require('./pg_db');

const authRoutes = require('./modules/auth/auth.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const collecteRoutes = require('./modules/collecte/collecte.routes');
const traitementRoutes = require('./modules/traitement/traitement.routes');
const referentielRoutes = require('./modules/referentiel/referentiel.routes');

const app = express();
const PORT = process.env.PORT || 3004;

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
}));
app.use(express.json());

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Formation — Plan de formation triennal',
      version: '1.0.0',
      description: 'API de gestion des demandes de formation de la Ville',
    },
    servers: [{ url: `http://localhost:${PORT}` }],
  },
  apis: ['./modules/**/*.routes.js'],
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', app: 'formation', timestamp: new Date().toISOString() });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/collecte', collecteRoutes);
app.use('/api/v1/traitement', traitementRoutes);
app.use('/api/v1/referentiel', referentielRoutes);

app.listen(PORT, () => {
  console.log(`[Server] Formation API running on port ${PORT}`);
});

setupDb().catch(err => {
  console.error('[DB] Init failed:', err.message);
});
