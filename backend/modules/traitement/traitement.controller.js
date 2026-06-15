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
  if (req.user.role === 'admin') return { role: 'admin', direction: null, service: null, fonction: null };
  const email = (req.user.email || '').toLowerCase();
  if (email && config.getServiceFormation().includes(email)) return { role: 'service_formation', direction: null, service: null, fonction: null };
  let dirFromEncadrants = '';
  try {
    const data = await hubdsi.getEncadrants(req.token);
    if (!data?.error) {
      const list = Array.isArray(data) ? data : (data.encadrants ?? data.data ?? []);
      if (Array.isArray(list)) {
        // 1. Match by email
        if (email) {
          for (const e of list) {
            if ((e.email || '').toLowerCase() === email) {
              const rawFonction = (e.role || e.fonction || e.type || '').toLowerCase();
              dirFromEncadrants = e.direction || e.direction_nom || e.direction_label || e.direction_name || e.nom_direction || '';
              const svc = e.service || e.service_nom || e.service_label || e.nom_service || null;
              if (rawFonction === 'responsable_service' || rawFonction === 'responsable') {
                return { role: 'responsable_service', direction: dirFromEncadrants, service: svc, fonction: rawFonction };
              }
              return { role: 'directeur', direction: dirFromEncadrants, service: svc, fonction: rawFonction };
            }
          }
        }
        // 2. Fallback: match by name
        const user = (req.user.username || '').toLowerCase();
        const dn = (req.user.displayName || '').toLowerCase();
        for (const e of list) {
          const nm1 = `${e.prenom || ''} ${e.nom || ''}`.trim();
          const nm2 = `${e.nom || ''} ${e.prenom || ''}`.trim();
          if ((nm1 && matchName(nm1, user, dn)) || (nm2 && matchName(nm2, user, dn))) {
            const rawFonction = (e.role || e.fonction || e.type || '').toLowerCase();
            dirFromEncadrants = e.direction || e.direction_nom || e.direction_label || e.direction_name || e.nom_direction || '';
            const svc = e.service || e.service_nom || e.service_label || e.nom_service || null;
            if (rawFonction === 'responsable_service' || rawFonction === 'responsable') {
              return { role: 'responsable_service', direction: dirFromEncadrants, service: svc, fonction: rawFonction };
            }
            return { role: 'directeur', direction: dirFromEncadrants, service: svc, fonction: rawFonction };
          }
        }
      }
    }
  } catch { /* ignore */ }
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
              return { role: 'directeur', direction: dirFromEncadrants || dirName, service: null, fonction: 'directeur' };
            }
            for (const s of (d.services || [])) {
              const resp = typeof s === 'string' ? '' : (s.responsable || '');
              const svcName = typeof s === 'string' ? s : (s.label || s.code || s.nom_service || '');
              if (matchName(resp, user, dn)) {
                return { role: 'responsable_service', direction: dirFromEncadrants || dirName, service: svcName, fonction: 'responsable_service' };
              }
            }
          }
        }
      }
    } catch { /* ignore */ }
  }
  return { role: 'agent', direction: null, service: null, fonction: null };
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

function mailRow(label, value) {
  return value ? `<tr><td style="padding:2px 12px 2px 0;color:#666;white-space:nowrap;vertical-align:top"><strong>${label}</strong></td><td style="padding:2px 0;color:#333">${value}</td></tr>` : '';
}

async function sendNotification(agentEmail, agentName, details, statut, motif) {
  try {
    const action = statut === 'valide' ? 'validée' : 'refusée';
    const accentColor = statut === 'valide' ? '#16a34a' : '#dc2626';

    const items = details.filter(Boolean).map((d) => {
      const titre = d.type === 'autre' ? (d.intitule || 'Formation') : (d.formation_libelle || 'Formation réglementaire');
      const organisme = d.organisme === 'CNFPT' ? 'CNFPT' : (d.organisme_nom || null);
      const axe = d.axe_libelle ? `${d.axe_libelle}${d.axe_description ? ' — ' + d.axe_description : ''}` : null;
      const rows = [
        d.type !== 'autre' && axe ? mailRow('Axe', axe) : '',
        d.type !== 'autre' && d.motivation ? mailRow('Motivation', d.motivation) : '',
        d.type === 'autre' && d.objectif ? mailRow('Objectif', d.objectif) : '',
        d.type === 'autre' && organisme ? mailRow('Organisme', organisme) : '',
        d.type === 'autre' && d.estimation_budget ? mailRow('Budget estimé', d.estimation_budget) : '',
        formatDateSouhaitee(d.date_souhaitee) ? mailRow('Date souhaitée', formatDateSouhaitee(d.date_souhaitee)) : '',
        mailRow("Nombre d'agents", String(d.nb_agents || 1)),
      ].join('');
      return `<li style="margin-bottom:12px">
        <strong style="color:#29345C">${titre}</strong>
        ${rows ? `<table style="margin-top:4px;border-spacing:0">${rows}</table>` : ''}
      </li>`;
    });

    const subject = `Demande de formation ${action}`;
    const content = `
<p>Bonjour <strong>${agentName}</strong>,</p>
<p>Votre demande de formation a été <strong style="color:${accentColor}">${action}</strong>.</p>
${motif ? `<p style="background:#fff3cd;border-left:4px solid #f59e0b;padding:8px 12px;margin:12px 0"><strong>Motif :</strong> ${motif}</p>` : ''}
<p><strong>Formations concernées :</strong></p>
<ol style="padding-left:20px;margin:0">${items.join('')}</ol>
<p>Cordialement,<br><strong>Service Formation</strong></p>`;

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

function isDGADGA(fonction) {
  if (!fonction) return false;
  const dgKeywords = ['dga', 'directeur.adjoint', 'directeur.general', 'directeur.général', 'dg', 'directeur.adjoint'];
  return dgKeywords.some((k) => fonction.replace(/[\s_-]+/g, '.').includes(k));
}

async function recapitulatif(req, res) {
  const org = await getUserOrg(req);
  const allowed = org.role === 'admin' || org.role === 'service_formation' || (org.role === 'directeur' && isDGADGA(org.fonction));
  if (!allowed) {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs, DGA et service formation' });
  }
  const rows = await repo.findAll();
  res.json(rows);
}

module.exports = { listSoumissions, getSoumission, valider, refuser, updateCommentaire, recapitulatif };
