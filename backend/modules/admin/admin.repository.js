const { db } = require('../../pg_db');

function findAllFormations() {
  return db.all('SELECT * FROM formation.formations_reglementaires ORDER BY libelle');
}

function createFormation({ libelle, description }) {
  return db.get(
    'INSERT INTO formation.formations_reglementaires (libelle, description) VALUES ($1, $2) RETURNING *',
    [libelle, description || null]
  );
}

function updateFormation(id, { libelle, description, active }) {
  return db.get(
    `UPDATE formation.formations_reglementaires
     SET libelle = COALESCE($1, libelle),
         description = COALESCE($2, description),
         active = COALESCE($3, active),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $4 RETURNING *`,
    [libelle || null, description ?? null, active !== undefined ? active : null, id]
  );
}

function deleteFormation(id) {
  return db.run('DELETE FROM formation.formations_reglementaires WHERE id = $1', [id]);
}

function findAllAxes() {
  return db.all('SELECT * FROM formation.axes ORDER BY libelle');
}

function createAxe({ libelle, description }) {
  return db.get(
    'INSERT INTO formation.axes (libelle, description) VALUES ($1, $2) RETURNING *',
    [libelle, description || null]
  );
}

function updateAxe(id, { libelle, description, active }) {
  return db.get(
    `UPDATE formation.axes
     SET libelle = COALESCE($1, libelle),
         description = COALESCE($2, description),
         active = COALESCE($3, active),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $4 RETURNING *`,
    [libelle || null, description ?? null, active !== undefined ? active : null, id]
  );
}

function deleteAxe(id) {
  return db.run('DELETE FROM formation.axes WHERE id = $1', [id]);
}

function viderBase() {
  return db.run('DELETE FROM formation.soumissions');
}

module.exports = { findAllFormations, createFormation, updateFormation, deleteFormation, findAllAxes, createAxe, updateAxe, deleteAxe, viderBase };
