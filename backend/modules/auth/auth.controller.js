const authService = require('./auth.service');
const hubdsi = require('../../services/hubdsi');
const config = require('../../services/config');

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

async function login(req, res) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Identifiants requis' });
  }

  const result = await authService.login(username, password);
  if (!result.success) {
    return res.status(401).json({ error: result.error });
  }

  res.json(result);
}

async function me(req, res) {
  const info = { user: req.user, org: { role: req.user.role === 'admin' ? 'admin' : 'agent', direction: null, service: null, fonction: null } };

  if (info.org.role === 'admin') { res.json(info); return; }

  const email = (req.user.email || '').toLowerCase();
  if (email && config.isServiceFormation(email)) {
    info.org.role = 'service_formation';
    info.org.direction = null;
    info.org.service = null;
    info.org.fonction = null;
    res.json(info);
    return;
  }

  try {
    const data = await hubdsi.getEncadrants(req.token);
    console.error('[me] encadrants:', data?.error ? JSON.stringify(data.error) : 'OK');
    if (!data?.error) {
      const list = Array.isArray(data) ? data : (data.encadrants ?? data.data ?? []);
      if (Array.isArray(list)) {
        // 1. Match by email
        if (email) {
          for (const e of list) {
            if ((e.email || '').toLowerCase() === email) {
              const rawFonction = (e.role || e.fonction || e.type || '').toLowerCase();
              info.org.role = (rawFonction === 'responsable_service' || rawFonction === 'responsable') ? 'responsable_service' : 'directeur';
              info.org.fonction = rawFonction;
              info.org.direction = e.direction || e.direction_nom || e.direction_label || e.direction_name || e.nom_direction || '';
              info.org.service = e.service || e.service_nom || e.service_label || e.nom_service || null;
              break;
            }
          }
        }
        // 2. Fallback: match by name (handles empty email in JWT)
        if (info.org.role === 'agent') {
          const user = (req.user.username || '').toLowerCase();
          const dn = (req.user.displayName || '').toLowerCase();
          for (const e of list) {
            const nm1 = `${e.prenom || ''} ${e.nom || ''}`.trim();
            const nm2 = `${e.nom || ''} ${e.prenom || ''}`.trim();
            if ((nm1 && matchName(nm1, user, dn)) || (nm2 && matchName(nm2, user, dn))) {
              const rawFonction = (e.role || e.fonction || e.type || '').toLowerCase();
              info.org.role = (rawFonction === 'responsable_service' || rawFonction === 'responsable') ? 'responsable_service' : 'directeur';
              info.org.fonction = rawFonction;
              info.org.direction = e.direction || e.direction_nom || e.direction_label || e.direction_name || e.nom_direction || '';
              info.org.service = e.service || e.service_nom || e.service_label || e.nom_service || null;
              break;
            }
          }
        }
      }
    }
  } catch (e) { console.error('[me] encadrants err:', e.message); }

  if ((info.org.role === 'directeur' && !info.org.direction) || info.org.role === 'agent') {
    try {
      const data = await hubdsi.getDirectionsServices(req.token);
      console.error('[me] orgchart:', data?.error ? JSON.stringify(data.error) : 'OK');
      if (!data?.error) {
        const org = Array.isArray(data) ? data : (data.directions ?? data.data ?? []);
        if (Array.isArray(org)) {
          const user = (req.user.username || '').toLowerCase();
          const dn = (req.user.displayName || '').toLowerCase();
          for (const d of org) {
            const dirName = d.direction || d.name || d.label || d.direction_nom || d.direction_label || d.nom_direction || '';
            if (matchName(d.responsable, user, dn)) {
              info.org.role = 'directeur';
              info.org.direction = info.org.direction || dirName;
              info.org.fonction = info.org.fonction || 'directeur';
              break;
            }
            for (const s of (d.services || [])) {
              const resp = typeof s === 'string' ? '' : (s.responsable || '');
              const svcName = typeof s === 'string' ? s : (s.label || s.code || s.nom_service || '');
              if (matchName(resp, user, dn)) {
                info.org.role = 'responsable_service';
                info.org.direction = info.org.direction || dirName;
                info.org.service = info.org.service || svcName;
                info.org.fonction = info.org.fonction || 'responsable_service';
                break;
              }
            }
          }
        }
      }
    } catch (e) { console.error('[me] fallback err:', e.message); }
  }

  res.json(info);
}

module.exports = { login, me };
