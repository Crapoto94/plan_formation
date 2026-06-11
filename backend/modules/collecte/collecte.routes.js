const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const controller = require('./collecte.controller');

const router = Router();
router.use(authenticate);

/**
 * @openapi
 * /api/v1/collecte/soumettre:
 *   post:
 *     tags: [Collecte]
 *     summary: Soumettre une demande de formation
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               service: { type: string }
 *               direction: { type: string }
 *               details:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     formation_id: { type: integer }
 *                     axe_id: { type: integer }
 *                     motivation: { type: string }
 *                     nb_agents: { type: integer }
 *     responses:
 *       201:
 *         description: Demande créée
 */
router.post('/soumettre', controller.soumettre);

/**
 * @openapi
 * /api/v1/collecte/mes-soumissions:
 *   get:
 *     tags: [Collecte]
 *     summary: Mes soumissions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des soumissions
 */
router.get('/mes-soumissions', controller.mesSoumissions);

module.exports = router;
