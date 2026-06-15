const repo = require('./collecte.repository');
const apm = require('../../services/apm');

function formatDateSouhaitee(raw) {
  if (!raw) return null;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) return parsed.join(', ');
  } catch { /* not JSON */ }
  return String(raw);
}

async function sendConfirmation(agentEmail, agentName, soumission) {
  try {
    const details = (soumission.details || []).filter(Boolean);
    const lines = details.map((d, i) => {
      const num = `${i + 1}.`;
      if (d.type === 'autre') {
        const parts = [
          `${num} ${d.intitule || 'Formation'}`,
          d.objectif ? `   Objectif : ${d.objectif}` : null,
          d.organisme_nom ? `   Organisme : ${d.organisme_nom}` : null,
          formatDateSouhaitee(d.date_souhaitee) ? `   Date souhaitée : ${formatDateSouhaitee(d.date_souhaitee)}` : null,
          d.estimation_budget ? `   Budget estimé : ${d.estimation_budget}` : null,
          `   Nombre d'agents : ${d.nb_agents || 1}`,
          d.justification ? `   Justification : ${d.justification}` : null,
        ];
        return parts.filter(Boolean).join('\n');
      } else {
        const formation = d.formation_libelle || 'Formation réglementaire';
        const axe = d.axe_libelle || null;
        const parts = [
          `${num} ${formation}`,
          axe ? `   Axe : ${axe}` : null,
          `   Nombre d'agents : ${d.nb_agents || 1}`,
          d.motivation ? `   Motivation : ${d.motivation}` : null,
        ];
        return parts.filter(Boolean).join('\n');
      }
    });

    const content = [
      `Bonjour ${agentName},`,
      ``,
      `Votre demande de formation a bien été enregistrée.`,
      ``,
      `Service : ${soumission.service}`,
      `Direction : ${soumission.direction}`,
      ``,
      `Formations demandées :`,
      ``,
      ...lines,
      ``,
      `Votre demande sera examinée par votre hiérarchie.`,
      ``,
      `Cordialement,`,
      `Service Formation`,
    ].join('\n');

    await apm.envoyerMail(agentEmail, 'Confirmation de votre demande de formation', content);
  } catch { /* email failure is non-blocking */ }
}

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

  if (soumission.agent_email) {
    const full = await repo.findById(soumission.id);
    sendConfirmation(soumission.agent_email, soumission.agent_name, full);
  }

  res.status(201).json(soumission);
}

async function mesSoumissions(req, res) {
  const rows = await repo.findByAgent(req.user.username);
  res.json(rows);
}

module.exports = { soumettre, mesSoumissions };
