const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const { requireAdmin, requireAdminOrServiceFormation } = require('../../middleware/admin');
const controller = require('./admin.controller');

const router = Router();
router.use(authenticate);

// GET en lecture seule — accessible à tout utilisateur authentifié
router.get('/formations', controller.listFormations);
router.get('/axes', controller.listAxes);
router.get('/domaines', controller.listDomaines);

// Routes d'écriture — admin ou service formation
router.post('/formations', requireAdminOrServiceFormation, controller.createFormation);
router.put('/formations/:id', requireAdminOrServiceFormation, controller.updateFormation);
router.delete('/formations/:id', requireAdminOrServiceFormation, controller.deleteFormation);
router.post('/axes', requireAdminOrServiceFormation, controller.createAxe);
router.put('/axes/:id', requireAdminOrServiceFormation, controller.updateAxe);
router.delete('/axes/:id', requireAdminOrServiceFormation, controller.deleteAxe);
router.post('/domaines', requireAdminOrServiceFormation, controller.createDomaine);
router.put('/domaines/:id', requireAdminOrServiceFormation, controller.updateDomaine);
router.delete('/domaines/:id', requireAdminOrServiceFormation, controller.deleteDomaine);

router.get('/service-formation', requireAdminOrServiceFormation, controller.getServiceFormation);
router.put('/service-formation', requireAdminOrServiceFormation, controller.updateServiceFormation);

router.get('/config', requireAdmin, controller.getConfig);
router.get('/page-config', authenticate, controller.getPageConfig);
router.put('/page-config', authenticate, controller.updatePageConfig);
router.put('/config', requireAdmin, controller.updateConfig);
router.post('/test-apm', requireAdmin, controller.testApm);
router.post('/test-hubdsi', requireAdmin, controller.testHubdsi);

router.delete('/vider-base', requireAdmin, controller.viderBase);

router.get('/ad/search', requireAdmin, controller.adSearch);

module.exports = router;
