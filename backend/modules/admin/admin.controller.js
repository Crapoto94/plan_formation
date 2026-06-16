const repo = require('./admin.repository');
const hubdsi = require('../../services/hubdsi');
const apmService = require('../../services/apm');
const configService = require('../../services/config');

async function listFormations(req, res) {
  const rows = await repo.findAllFormations();
  res.json(rows);
}

async function createFormation(req, res) {
  const { libelle, description } = req.body;
  if (!libelle) return res.status(400).json({ error: 'Libelle requis' });
  const row = await repo.createFormation({ libelle, description });
  res.status(201).json(row);
}

async function updateFormation(req, res) {
  const { id } = req.params;
  const { libelle, description, active } = req.body;
  const row = await repo.updateFormation(id, { libelle, description, active });
  if (!row) return res.status(404).json({ error: 'Formation introuvable' });
  res.json(row);
}

async function deleteFormation(req, res) {
  const { id } = req.params;
  try {
    const result = await repo.deleteFormation(id);
    if (!result.changes) return res.status(404).json({ error: 'Formation introuvable' });
    res.json({ success: true });
  } catch (err) {
    if (err.code === '23503') return res.status(409).json({ error: 'Cette formation est utilisée dans des demandes existantes et ne peut pas être supprimée.' });
    throw err;
  }
}

async function listAxes(req, res) {
  const rows = await repo.findAllAxes();
  res.json(rows);
}

async function createAxe(req, res) {
  const { libelle, description } = req.body;
  if (!libelle) return res.status(400).json({ error: 'Libelle requis' });
  const row = await repo.createAxe({ libelle, description });
  res.status(201).json(row);
}

async function updateAxe(req, res) {
  const { id } = req.params;
  const { libelle, description, active } = req.body;
  const row = await repo.updateAxe(id, { libelle, description, active });
  if (!row) return res.status(404).json({ error: 'Axe introuvable' });
  res.json(row);
}

async function deleteAxe(req, res) {
  const { id } = req.params;
  try {
    const result = await repo.deleteAxe(id);
    if (!result.changes) return res.status(404).json({ error: 'Axe introuvable' });
    res.json({ success: true });
  } catch (err) {
    if (err.code === '23503') return res.status(409).json({ error: 'Cet axe est utilisé dans des demandes existantes et ne peut pas être supprimé.' });
    throw err;
  }
}

async function getConfig(req, res) {
  const apiConfig = configService.getApiConfig();
  const fileConfig = configService.read();
  const pageConfig = configService.getPageConfig();
  res.json({
    apm: {
      url: apiConfig.apm.url,
      key: apiConfig.apm.key,
      keyOverridden: !!fileConfig.apm?.key,
    },
    hubdsi: {
      url: apiConfig.hubdsi.url,
      key: apiConfig.hubdsi.key,
      path: apiConfig.hubdsi.path,
      keyOverridden: !!fileConfig.hubdsi?.key,
    },
    postgres: { host: process.env.POSTGRES_HOST || '', database: process.env.POSTGRES_DB || '' },
    ...pageConfig,
  });
}

async function updateConfig(req, res) {
  const { apm, hubdsi, message_general, description_collecte, description_traitement, description_recapitulatif } = req.body;
  const current = configService.read();
  const updated = {
    ...current,
    apm: {
      url: apm?.url ?? current.apm?.url ?? process.env.APM_API_URL,
      key: apm?.key ?? current.apm?.key ?? process.env.APM_API_KEY,
    },
    hubdsi: {
      url: hubdsi?.url ?? current.hubdsi?.url ?? process.env.HUBDSI_API_URL,
      key: hubdsi?.key ?? current.hubdsi?.key ?? process.env.HUBDSI_API_KEY,
      path: hubdsi?.path ?? current.hubdsi?.path ?? '/api/admin/rh/organisation-chart',
    },
    message_general: message_general !== undefined ? message_general : current.message_general,
    description_collecte: description_collecte !== undefined ? description_collecte : current.description_collecte,
    description_traitement: description_traitement !== undefined ? description_traitement : current.description_traitement,
    description_recapitulatif: description_recapitulatif !== undefined ? description_recapitulatif : current.description_recapitulatif,
  };
  configService.write(updated);
  res.json({ success: true, config: updated });
}

async function testApm(req, res) {
  const apiConfig = configService.getApiConfig();
  const { username } = req.body;
  if (!username) return res.json({ success: false, error: 'Nom d\'utilisateur requis' });
  try {
    const result = await apmService.rechercherAgent(username);
    if (result.error) return res.json({ success: false, error: result.error });
    return res.json({ success: true, count: Array.isArray(result) ? result.length : 0, data: result });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
}

async function testHubdsi(req, res) {
  const apiConfig = configService.getApiConfig();
  const result = await hubdsi.getDirectionsServices(req.token);
  if (result.error) {
    return res.json({ success: false, error: result.error, config: { url: apiConfig.hubdsi.url, path: apiConfig.hubdsi.path } });
  }
  const count = Array.isArray(result) ? result.length : 0;
  res.json({ success: true, count, data: result, structure: typeof result, config: { url: apiConfig.hubdsi.url, path: apiConfig.hubdsi.path } });
}

async function adSearch(req, res) {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Paramètre q requis' });
  try {
    const result = await apmService.rechercherAgent(q);
    if (result.error) return res.status(502).json({ error: result.error });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getServiceFormation(req, res) {
  res.json({ emails: configService.getServiceFormation() });
}

async function updateServiceFormation(req, res) {
  const { emails } = req.body;
  if (!Array.isArray(emails)) return res.status(400).json({ error: 'emails doit être un tableau' });
  configService.setServiceFormation(emails);
  res.json({ success: true, emails });
}

async function listDomaines(req, res) {
  const rows = await repo.findAllDomaines();
  res.json(rows);
}

async function createDomaine(req, res) {
  const { libelle } = req.body;
  if (!libelle) return res.status(400).json({ error: 'Libelle requis' });
  const row = await repo.createDomaine({ libelle });
  res.status(201).json(row);
}

async function updateDomaine(req, res) {
  const { id } = req.params;
  const { libelle, active } = req.body;
  const row = await repo.updateDomaine(id, { libelle, active });
  if (!row) return res.status(404).json({ error: 'Domaine introuvable' });
  res.json(row);
}

async function deleteDomaine(req, res) {
  const { id } = req.params;
  try {
    const result = await repo.deleteDomaine(id);
    if (!result.changes) return res.status(404).json({ error: 'Domaine introuvable' });
    res.json({ success: true });
  } catch (err) {
    if (err.code === '23503') return res.status(409).json({ error: 'Ce domaine est utilisé dans des demandes existantes et ne peut pas être supprimé.' });
    throw err;
  }
}

async function getPageConfig(req, res) {
  res.json(configService.getPageConfig());
}

async function viderBase(req, res) {
  try {
    await repo.viderBase();
    res.json({ success: true });
  } catch (err) {
    console.error('[admin] viderBase error:', err.message);
    res.status(500).json({ error: 'Erreur lors de la suppression des demandes' });
  }
}

module.exports = { listFormations, createFormation, updateFormation, deleteFormation, listAxes, createAxe, updateAxe, deleteAxe, listDomaines, createDomaine, updateDomaine, deleteDomaine, getConfig, updateConfig, getPageConfig, testApm, testHubdsi, adSearch, getServiceFormation, updateServiceFormation, viderBase };
