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
  const result = await repo.deleteFormation(id);
  if (!result.changes) return res.status(404).json({ error: 'Formation introuvable' });
  res.json({ success: true });
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
  const result = await repo.deleteAxe(id);
  if (!result.changes) return res.status(404).json({ error: 'Axe introuvable' });
  res.json({ success: true });
}

async function getConfig(req, res) {
  const apiConfig = configService.getApiConfig();
  const fileConfig = configService.read();
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
  });
}

async function updateConfig(req, res) {
  const { apm, hubdsi } = req.body;
  const current = configService.read();
  const updated = {
    apm: {
      url: apm?.url ?? current.apm?.url ?? process.env.APM_API_URL,
      key: apm?.key ?? current.apm?.key ?? process.env.APM_API_KEY,
    },
    hubdsi: {
      url: hubdsi?.url ?? current.hubdsi?.url ?? process.env.HUBDSI_API_URL,
      key: hubdsi?.key ?? current.hubdsi?.key ?? process.env.HUBDSI_API_KEY,
      path: hubdsi?.path ?? current.hubdsi?.path ?? '/api/admin/rh/organisation-chart',
    },
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

module.exports = { listFormations, createFormation, updateFormation, deleteFormation, listAxes, createAxe, updateAxe, deleteAxe, getConfig, updateConfig, testApm, testHubdsi, adSearch, getServiceFormation, updateServiceFormation };
