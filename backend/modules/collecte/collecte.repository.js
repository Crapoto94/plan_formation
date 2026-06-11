const { db } = require('../../pg_db');

async function createSoumission({ agent_name, agent_email, service, direction, details }) {
  const soumission = await db.get(
    `INSERT INTO formation.soumissions (agent_name, agent_email, service, direction)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [agent_name, agent_email, service, direction]
  );

  for (const d of details) {
    const type = d.type || 'reglementaire';
    if (type === 'reglementaire') {
      await db.run(
        `INSERT INTO formation.soumission_details (soumission_id, formation_id, axe_id, motivation, nb_agents, type)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [soumission.id, d.formation_id, d.axe_id || null, d.motivation || null, d.nb_agents || 1, type]
      );
    } else {
      const dateSouhaitee = Array.isArray(d.date_souhaitee) ? JSON.stringify(d.date_souhaitee) : (d.date_souhaitee || null);
      await db.run(
        `INSERT INTO formation.soumission_details (soumission_id, formation_id, axe_id, nb_agents, type, intitule, objectif, date_souhaitee, organisme, organisme_nom, justification)
         VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [soumission.id, d.axe_id || null, d.nb_agents || 1, type, d.intitule || null, d.objectif || null, dateSouhaitee, d.organisme || null, d.organisme_nom || null, d.justification || null]
      );
    }
  }

  return soumission;
}

function findByAgent(agentName) {
  return db.all(
    `SELECT s.*, json_agg(json_build_object(
       'id', sd.id,
       'formation_id', sd.formation_id,
       'axe_id', sd.axe_id,
       'motivation', sd.motivation,
       'nb_agents', sd.nb_agents,
       'formation_libelle', f.libelle,
       'axe_libelle', a.libelle,
       'type', sd.type,
       'intitule', sd.intitule,
       'objectif', sd.objectif,
       'date_souhaitee', sd.date_souhaitee,
       'organisme', sd.organisme,
       'organisme_nom', sd.organisme_nom,
       'justification', sd.justification
     )) as details
     FROM formation.soumissions s
     LEFT JOIN formation.soumission_details sd ON sd.soumission_id = s.id
     LEFT JOIN formation.formations_reglementaires f ON f.id = sd.formation_id
     LEFT JOIN formation.axes a ON a.id = sd.axe_id
     WHERE s.agent_name = $1
     GROUP BY s.id
     ORDER BY s.created_at DESC`,
    [agentName]
  );
}

module.exports = { createSoumission, findByAgent };
