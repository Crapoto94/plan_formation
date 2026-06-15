const { db } = require('../../pg_db');

const BASE = `
  SELECT s.*, json_agg(json_build_object(
    'id', sd.id,
    'formation_id', sd.formation_id,
    'domaine_id', sd.domaine_id,
    'axe_id', sd.axe_id,
    'motivation', sd.motivation,
    'nb_agents', sd.nb_agents,
    'formation_libelle', f.libelle,
    'domaine_libelle', d.libelle,
    'axe_libelle', a.libelle,
    'axe_description', a.description,
    'type', sd.type,
    'intitule', sd.intitule,
    'objectif', sd.objectif,
    'date_souhaitee', sd.date_souhaitee,
    'organisme', sd.organisme,
    'organisme_nom', sd.organisme_nom,
    'justification', sd.justification,
    'estimation_budget', sd.estimation_budget,
    'statut', sd.statut,
    'motif_refus', sd.motif_refus
  )) as details
  FROM formation.soumissions s
  LEFT JOIN formation.soumission_details sd ON sd.soumission_id = s.id
  LEFT JOIN formation.formations_reglementaires f ON f.id = sd.formation_id
  LEFT JOIN formation.domaines d ON d.id = sd.domaine_id
  LEFT JOIN formation.axes a ON a.id = sd.axe_id
`;

const GROUP = `GROUP BY s.id ORDER BY s.service, s.created_at DESC`;

function findAll() {
  return db.all(`${BASE} ${GROUP}`);
}

function findByStatut(statut) {
  return db.all(`${BASE} WHERE s.statut = $1 ${GROUP}`, [statut]);
}

function findByDirection(direction) {
  return db.all(`${BASE} WHERE s.direction = $1 ${GROUP}`, [direction]);
}

function findByService(service) {
  return db.all(`${BASE} WHERE s.service = $1 ${GROUP}`, [service]);
}

function findByAgent(agent_name) {
  return db.all(`${BASE} WHERE s.agent_name ILIKE $1 ${GROUP}`, [`%${agent_name}%`]);
}

function findById(id) {
  return db.get(`${BASE} WHERE s.id = $1 ${GROUP}`, [id]);
}

function updateStatut(id, statut) {
  return db.get(
    `UPDATE formation.soumissions SET statut = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
    [statut, id]
  );
}

function batchUpdateStatut(ids, statut, motif) {
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
  const offset = ids.length + 1;
  return db.all(
    `UPDATE formation.soumissions
     SET statut = $${offset}, motif_refus = COALESCE($${offset + 1}, motif_refus), updated_at = CURRENT_TIMESTAMP
     WHERE id IN (${placeholders}) RETURNING *`,
    [...ids, statut, motif || null]
  );
}

function updateCommentaire(id, commentaire) {
  return db.get(
    `UPDATE formation.soumissions SET commentaire = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
    [commentaire, id]
  );
}

function batchUpdateDetailStatut(detailIds, statut, motif) {
  const placeholders = detailIds.map((_, i) => `$${i + 1}`).join(',');
  const offset = detailIds.length + 1;
  return db.all(
    `UPDATE formation.soumission_details
     SET statut = $${offset}, motif_refus = COALESCE($${offset + 1}, motif_refus)
     WHERE id IN (${placeholders}) RETURNING *`,
    [...detailIds, statut, motif || null]
  );
}

function getSoumissionIdByDetail(detailId) {
  return db.get(
    `SELECT soumission_id FROM formation.soumission_details WHERE id = $1`,
    [detailId]
  );
}

function getDetailsBySoumission(soumissionId) {
  return db.all(
    `SELECT * FROM formation.soumission_details WHERE soumission_id = $1`,
    [soumissionId]
  );
}

function updateSoumissionStatut(id, statut) {
  return db.get(
    `UPDATE formation.soumissions SET statut = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
    [statut, id]
  );
}

module.exports = { findAll, findByStatut, findByDirection, findByService, findByAgent, findById, updateStatut, batchUpdateStatut, updateCommentaire, batchUpdateDetailStatut, getSoumissionIdByDetail, getDetailsBySoumission, updateSoumissionStatut };
