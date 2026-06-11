const repo = require('./collecte.repository');

async function soumettre(req, res) {
  const { service, direction, details } = req.body;
  if (!service || !direction || !details || !details.length) {
    return res.status(400).json({ error: 'Service, direction et au moins un détail requis' });
  }

  const soumission = await repo.createSoumission({
    agent_name: req.user.username,
    agent_email: req.user.email || null,
    service,
    direction,
    details,
  });

  res.status(201).json(soumission);
}

async function mesSoumissions(req, res) {
  const rows = await repo.findByAgent(req.user.username);
  res.json(rows);
}

module.exports = { soumettre, mesSoumissions };
