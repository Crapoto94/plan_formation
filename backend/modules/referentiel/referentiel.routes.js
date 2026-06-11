const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const controller = require('./referentiel.controller');

const router = Router();
router.use(authenticate);

/**
 * @openapi
 * /api/v1/referentiel/directions-services:
 *   get:
 *     tags: [Référentiel]
 *     summary: Liste des directions et services (Hub DSI)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des directions avec leurs services
 */
router.get('/directions-services', controller.directionsServices);

module.exports = router;
