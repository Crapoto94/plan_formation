const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const { requireAdmin } = require('../../middleware/admin');
const controller = require('./admin.controller');

const router = Router();
router.use(authenticate);

// GET en lecture seule — accessible à tout utilisateur authentifié
router.get('/formations', controller.listFormations);
router.get('/axes', controller.listAxes);
router.get('/domaines', controller.listDomaines);

// Routes d'écriture — admin uniquement
router.post('/formations', requireAdmin, controller.createFormation);
router.put('/formations/:id', requireAdmin, controller.updateFormation);
router.delete('/formations/:id', requireAdmin, controller.deleteFormation);
router.post('/axes', requireAdmin, controller.createAxe);
router.put('/axes/:id', requireAdmin, controller.updateAxe);
router.delete('/axes/:id', requireAdmin, controller.deleteAxe);
router.post('/domaines', requireAdmin, controller.createDomaine);
router.put('/domaines/:id', requireAdmin, controller.updateDomaine);
router.delete('/domaines/:id', requireAdmin, controller.deleteDomaine);

router.get('/config', requireAdmin, controller.getConfig);
router.get('/page-config', authenticate, controller.getPageConfig);
router.put('/config', requireAdmin, controller.updateConfig);
router.post('/test-apm', requireAdmin, controller.testApm);
router.post('/test-hubdsi', requireAdmin, controller.testHubdsi);

router.delete('/vider-base', requireAdmin, controller.viderBase);

router.get('/ad/search', requireAdmin, controller.adSearch);
router.get('/service-formation', requireAdmin, controller.getServiceFormation);
router.put('/service-formation', requireAdmin, controller.updateServiceFormation);

module.exports = router;
