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

function row(label, value) {
  return value ? `<tr><td style="padding:2px 12px 2px 0;color:#666;white-space:nowrap;vertical-align:top"><strong>${label}</strong></td><td style="padding:2px 0;color:#333">${value}</td></tr>` : '';
}

async function sendConfirmation(agentEmail, agentName, soumission) {
  try {
    const details = (soumission.details || []).filter(Boolean);
    const items = details.map((d) => {
      const titre = d.type === 'autre' ? (d.intitule || 'Formation') : (d.formation_libelle || 'Formation réglementaire');
      const organisme = d.organisme === 'CNFPT' ? 'CNFPT' : (d.organisme_nom || null);
      const rows = [
        d.type !== 'autre' && d.axe_libelle ? row('Axe', d.axe_libelle) : '',
        d.type !== 'autre' && d.motivation ? row('Motivation', d.motivation) : '',
        d.type === 'autre' && d.objectif ? row('Objectif', d.objectif) : '',
        d.type === 'autre' && organisme ? row('Organisme', organisme) : '',
        d.type === 'autre' && d.estimation_budget ? row('Budget estimé', d.estimation_budget) : '',
        d.type === 'autre' && d.justification ? row('Justification', d.justification) : '',
        formatDateSouhaitee(d.date_souhaitee) ? row('Date souhaitée', formatDateSouhaitee(d.date_souhaitee)) : '',
        row("Nombre d'agents", String(d.nb_agents || 1)),
      ].join('');
      return `<li style="margin-bottom:12px">
        <strong style="color:#29345C">${titre}</strong>
        ${rows ? `<table style="margin-top:4px;border-spacing:0">${rows}</table>` : ''}
      </li>`;
    });

    const content = `
<p>Bonjour <strong>${agentName}</strong>,</p>
<p>Votre demande de formation a bien été enregistrée.</p>
<table style="border-spacing:0;margin-bottom:12px">
  ${row('Service', soumission.service)}
  ${row('Direction', soumission.direction)}
</table>
<p><strong>Formations demandées :</strong></p>
<ol style="padding-left:20px;margin:0">${items.join('')}</ol>
<p>Votre demande sera examinée par votre hiérarchie.</p>
<p>Cordialement,<br><strong>Service Formation</strong></p>`;

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
