const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB || 'ivry_admin',
  password: process.env.POSTGRES_PASSWORD,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
});

async function setupDb() {
  const client = await pool.connect();
  try {
    await client.query('CREATE SCHEMA IF NOT EXISTS formation;');

    await client.query(`
      CREATE TABLE IF NOT EXISTS formation.formations_reglementaires (
        id          SERIAL PRIMARY KEY,
        libelle     VARCHAR(255) NOT NULL,
        description TEXT,
        active      BOOLEAN DEFAULT true,
        created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS formation.axes (
        id          SERIAL PRIMARY KEY,
        libelle     VARCHAR(255) NOT NULL,
        description TEXT,
        active      BOOLEAN DEFAULT true,
        created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS formation.soumissions (
        id            SERIAL PRIMARY KEY,
        agent_name    VARCHAR(255) NOT NULL,
        agent_email   VARCHAR(255),
        service       VARCHAR(255) NOT NULL,
        direction     VARCHAR(255) NOT NULL,
        statut        VARCHAR(50) DEFAULT 'en_attente',
        commentaire   TEXT,
        motif_refus   TEXT,
        created_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`ALTER TABLE formation.soumissions ADD COLUMN IF NOT EXISTS commentaire TEXT;`);
    await client.query(`ALTER TABLE formation.soumissions ADD COLUMN IF NOT EXISTS motif_refus TEXT;`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS formation.soumission_details (
        id              SERIAL PRIMARY KEY,
        soumission_id   INTEGER NOT NULL REFERENCES formation.soumissions(id) ON DELETE CASCADE,
        formation_id    INTEGER REFERENCES formation.formations_reglementaires(id),
        axe_id          INTEGER REFERENCES formation.axes(id),
        motivation      TEXT,
        nb_agents       INTEGER NOT NULL DEFAULT 1,
        type            VARCHAR(20) DEFAULT 'reglementaire',
        intitule        TEXT,
        objectif        TEXT,
        date_souhaitee  TEXT,
        organisme       VARCHAR(50),
        organisme_nom   TEXT,
        justification   TEXT,
        created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`ALTER TABLE formation.soumission_details ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'reglementaire';`);
    await client.query(`ALTER TABLE formation.soumission_details ADD COLUMN IF NOT EXISTS intitule TEXT;`);
    await client.query(`ALTER TABLE formation.soumission_details ADD COLUMN IF NOT EXISTS objectif TEXT;`);
    await client.query(`ALTER TABLE formation.soumission_details ADD COLUMN IF NOT EXISTS date_souhaitee TEXT;`);
    await client.query(`ALTER TABLE formation.soumission_details ADD COLUMN IF NOT EXISTS organisme VARCHAR(50);`);
    await client.query(`ALTER TABLE formation.soumission_details ADD COLUMN IF NOT EXISTS organisme_nom TEXT;`);
    await client.query(`ALTER TABLE formation.soumission_details ADD COLUMN IF NOT EXISTS justification TEXT;`);

    console.log('[DB] Schéma formation initialisé');
  } finally {
    client.release();
  }
}

const db = {
  all: (sql, p = []) => pool.query(sql, p).then(r => r.rows),
  get: (sql, p = []) => pool.query(sql, p).then(r => r.rows[0]),
  run: (sql, p = []) => pool.query(sql, p).then(r => ({ changes: r.rowCount })),
};

module.exports = { pool, db, setupDb };
