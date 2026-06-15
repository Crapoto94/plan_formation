const repo = require('./traitement.repository');
const hubdsi = require('../../services/hubdsi');
const config = require('../../services/config');
const apm = require('../../services/apm');

function matchName(field, username, displayName) {
  if (!field) return false;
  const f = field.toLowerCase().trim();
  const un = (username || '').toLowerCase();
  const dn = (displayName || '').toLowerCase();
  if (f === un || f === dn) return true;
  const split = (s) => [...new Set(s.split(/[. \-_]+/).filter(Boolean))];
  const userParts = [...new Set([...split(un), ...split(dn)])];
  const fieldParts = split(f);
  const matched = fieldParts.filter((p) => userParts.includes(p));
  return matched.length >= Math.min(fieldParts.length, 2);
}

async function getUserOrg(req) {
  if (req.user.role === 'admin') return { role: 'admin', direction: null, service: null };
  const email = (req.user.email || '').toLowerCase();
  if (email && config.getServiceFormation().includes(email)) return { role: 'service_formation', direction: null, service: null };
  let dirFromEncadrants = '';
  if (email) {
    try {
      const data = await hubdsi.getEncadrants(req.token);
      if (!data?.error) {
        const list = Array.isArray(data) ? data : (data.encadrants ?? data.data ?? []);
        if (Array.isArray(list)) {
          for (const e of list) {
            if ((e.email || '').toLowerCase() === email) {
              const role = (e.role || e.fonction || e.type || '').toLowerCase();
              dirFromEncadrants = e.direction || e.direction_nom || e.direction_label || e.direction_name || e.nom_direction || '';
              const svc = e.service || e.service_nom || e.service_label || e.nom_service || null;
              if (role === 'responsable_service' || role === 'responsable') {
                return { role: 'responsable_service', direction: dirFromEncadrants, service: svc };
              }
              return { role: 'directeur', direction: dirFromEncadrants, service: svc };
            }
          }
        }
      }
    } catch { /* ignore */ }
  }
  if (!email) {
    try {
      const data = await hubdsi.getDirectionsServices(req.token);
      if (!data?.error) {
        const org = Array.isArray(data) ? data : (data.directions ?? data.data ?? []);
        if (Array.isArray(org)) {
          const user = (req.user.username || '').toLowerCase();
          const dn = (req.user.displayName || '').toLowerCase();
          for (const d of org) {
            const dirName = d.direction || d.name || d.label || d.direction_nom || d.direction_label || d.nom_direction || '';
            if (matchName(d.responsable, user, dn)) {
              return { role: 'directeur', direction: dirFromEncadrants || dirName, service: null };
            }
            for (const s of (d.services || [])) {
              const resp = typeof s === 'string' ? '' : (s.responsable || '');
              const svcName = typeof s === 'string' ? s : (s.label || s.code || s.nom_service || '');
              if (matchName(resp, user, dn)) {
                return { role: 'responsable_service', direction: dirFromEncadrants || dirName, service: svcName };
              }
            }
          }
        }
      }
    } catch { /* ignore */ }
  }
  return { role: 'agent', direction: null, service: null };
}

async function listSoumissions(req, res) {
  const org = await getUserOrg(req);

  let rows;
  if (org.role === 'admin' || org.role === 'service_formation') {
    rows = await repo.findAll();
  } else if (org.role === 'directeur' && org.direction) {
    rows = await repo.findByDirection(org.direction);
  } else if (org.role === 'responsable_service' && org.service) {
    rows = await repo.findByService(org.service);
  } else {
    rows = await repo.findByAgent(req.user.username || '');
  }
  res.json(rows);
}

async function getSoumission(req, res) {
  const row = await repo.findById(req.params.id);
  if (!row) return res.status(404).json({ error: 'Soumission introuvable' });
  res.json(row);
}

async function canValidate(req) {
  if (req.user.role === 'admin') return true;
  const email = (req.user.email || '').toLowerCase();
  if (email && config.getServiceFormation().includes(email)) return true;
  if (email) {
    try {
      const data = await hubdsi.getEncadrants(req.token);
      if (!data?.error) {
        const list = Array.isArray(data) ? data : (data.encadrants ?? data.data ?? []);
        if (Array.isArray(list) && list.some((e) => (e.email || '').toLowerCase() === email)) return true;
      }
    } catch { /* ignore */ }
  }
  try {
    const data = await hubdsi.getDirectionsServices(req.token);
    if (!data?.error) {
      const org = Array.isArray(data) ? data : (data.directions ?? data.data ?? []);
      if (Array.isArray(org)) {
        const user = (req.user.username || '').toLowerCase();
        const dn = (req.user.displayName || '').toLowerCase();
        if (org.some((d) => matchName(d.responsable, user, dn))) return true;
      }
    }
  } catch { /* ignore */ }
  return false;
}

function formatDateSouhaitee(raw) {
  if (!raw) return null;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) return parsed.join(', ');
  } catch { /* not JSON */ }
  return String(raw);
}

async function sendNotification(agentEmail, agentName, details, statut, motif) {
  try {
    const action = statut === 'valide' ? 'validée' : 'refusée';
    const lines = details.filter(Boolean).map((d, i) => {
      const num = `${i + 1}.`;
      if (d.type === 'autre') {
        return [
          `${num} ${d.intitule || 'Formation'}`,
          d.objectif ? `   Objectif : ${d.objectif}` : null,
          d.organisme === 'CNFPT' ? `   Organisme : CNFPT` : (d.organisme_nom ? `   Organisme : ${d.organisme_nom}` : null),
          formatDateSouhaitee(d.date_souhaitee) ? `   Date souhaitée : ${formatDateSouhaitee(d.date_souhaitee)}` : null,
          d.estimation_budget ? `   Budget estimé : ${d.estimation_budget}` : null,
          `   Nombre d'agents : ${d.nb_agents || 1}`,
        ].filter(Boolean).join('\n');
      } else {
        const axe = d.axe_libelle ? `${d.axe_libelle}${d.axe_description ? ' — ' + d.axe_description : ''}` : null;
        return [
          `${num} ${d.formation_libelle || 'Formation réglementaire'}`,
          axe ? `   Axe : ${axe}` : null,
          `   Nombre d'agents : ${d.nb_agents || 1}`,
          d.motivation ? `   Motivation : ${d.motivation}` : null,
        ].filter(Boolean).join('\n');
      }
    });

    const subject = `Demande de formation ${action}`;
    const content = [
      `Bonjour ${agentName},`,
      ``,
      `Votre demande de formation a été ${action}.`,
      motif ? `Motif : ${motif}` : null,
      ``,
      `Formations concernées :`,
      ``,
      ...lines,
      ``,
      `Cordialement,`,
      `Service Formation`,
    ].filter((l) => l !== null).join('\n');
    await apm.envoyerMail(agentEmail, subject, content);
  } catch { /* email failure is non-blocking */ }
}

async function valider(req, res) {
  if (!(await canValidate(req))) return res.status(403).json({ error: 'Réservé aux directeurs et administrateurs' });
  const { detail_ids, commentaire } = req.body;
  if (!detail_ids || !detail_ids.length) return res.status(400).json({ error: 'Aucune demande sélectionnée' });
  const validIds = detail_ids.filter((id) => id && Number.isInteger(Number(id)) && Number(id) > 0);
  if (!validIds.length) return res.status(400).json({ error: 'Aucun identifiant de formation valide' });
  try {
    const rows = await repo.batchUpdateDetailStatut(validIds, 'valide', null);
    const soumissionIds = [...new Set(rows.map((r) => r.soumission_id))];
    for (const sid of soumissionIds) {
      const all = await repo.getDetailsBySoumission(sid);
      if (all.every((d) => d.statut === 'valide')) {
        await repo.updateSoumissionStatut(sid, 'valide');
      }
    }
    if (commentaire) for (const sid of soumissionIds) await repo.updateCommentaire(sid, commentaire);

    if (soumissionIds.length > 0) {
      const soumission = await repo.findById(soumissionIds[0]);
      if (soumission?.agent_email) {
        const updatedIds = new Set(rows.map((r) => r.id));
        const details = (soumission.details || []).filter((d) => d && updatedIds.has(d.id));
        sendNotification(soumission.agent_email, soumission.agent_name, details, 'valide', null);
      }
    }

    res.json({ success: true, count: rows.length });
  } catch (err) {
    console.error('[traitement] valider error:', err.message);
    res.status(500).json({ error: 'Erreur interne lors de la validation', detail: err.message });
  }
}

async function refuser(req, res) {
  if (!(await canValidate(req))) return res.status(403).json({ error: 'Réservé aux directeurs et administrateurs' });
  const { detail_ids, motif } = req.body;
  if (!detail_ids || !detail_ids.length) return res.status(400).json({ error: 'Aucune demande sélectionnée' });
  if (!motif) return res.status(400).json({ error: 'Motif de refus requis' });
  const validIds = detail_ids.filter((id) => id && Number.isInteger(Number(id)) && Number(id) > 0);
  if (!validIds.length) return res.status(400).json({ error: 'Aucun identifiant de formation valide' });
  try {
    const rows = await repo.batchUpdateDetailStatut(validIds, 'refuse', motif);
    const soumissionIds = [...new Set(rows.map((r) => r.soumission_id))];
    for (const sid of soumissionIds) {
      const all = await repo.getDetailsBySoumission(sid);
      if (all.every((d) => d.statut === 'refuse')) {
        await repo.updateSoumissionStatut(sid, 'refuse');
      }
    }

    if (soumissionIds.length > 0) {
      const soumission = await repo.findById(soumissionIds[0]);
      if (soumission?.agent_email) {
        const updatedIds = new Set(rows.map((r) => r.id));
        const details = (soumission.details || []).filter((d) => d && updatedIds.has(d.id));
        sendNotification(soumission.agent_email, soumission.agent_name, details, 'refuse', motif);
      }
    }

    res.json({ success: true, count: rows.length });
  } catch (err) {
    console.error('[traitement] refuser error:', err.message);
    res.status(500).json({ error: 'Erreur interne lors du refus', detail: err.message });
  }
}

async function updateCommentaire(req, res) {
  const { commentaire } = req.body;
  const row = await repo.updateCommentaire(req.params.id, commentaire);
  if (!row) return res.status(404).json({ error: 'Soumission introuvable' });
  res.json(row);
}

async function recapitulatif(req, res) {
  const org = await getUserOrg(req);
  if (!['admin', 'service_formation', 'directeur'].includes(org.role)) {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs, DGA et service formation' });
  }
  const rows = await repo.findAll();
  res.json(rows);
}

module.exports = { listSoumissions, getSoumission, valider, refuser, updateCommentaire, recapitulatif };
