const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const controller = require('./traitement.controller');

const router = Router();
router.use(authenticate);

router.get('/soumissions', controller.listSoumissions);
router.get('/soumissions/:id', controller.getSoumission);

router.post('/valider', controller.valider);
router.post('/refuser', controller.refuser);
router.patch('/soumissions/:id/commentaire', controller.updateCommentaire);

module.exports = router;
