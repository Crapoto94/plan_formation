-- Migration 001: Initialisation du schéma formation
-- Appliquer : psql -U <user> -d ivry_admin -f 001_init.sql

CREATE SCHEMA IF NOT EXISTS formation;

CREATE TABLE IF NOT EXISTS formation.formations_reglementaires (
    id          SERIAL PRIMARY KEY,
    libelle     VARCHAR(255) NOT NULL,
    description TEXT,
    active      BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS formation.axes (
    id          SERIAL PRIMARY KEY,
    libelle     VARCHAR(255) NOT NULL,
    description TEXT,
    active      BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS formation.soumissions (
    id            SERIAL PRIMARY KEY,
    agent_name    VARCHAR(255) NOT NULL,
    agent_email   VARCHAR(255),
    service       VARCHAR(255) NOT NULL,
    direction     VARCHAR(255) NOT NULL,
    statut        VARCHAR(50) DEFAULT 'en_attente',
    created_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS formation.soumission_details (
    id              SERIAL PRIMARY KEY,
    soumission_id   INTEGER NOT NULL REFERENCES formation.soumissions(id) ON DELETE CASCADE,
    formation_id    INTEGER NOT NULL REFERENCES formation.formations_reglementaires(id),
    axe_id          INTEGER REFERENCES formation.axes(id),
    motivation      TEXT,
    nb_agents       INTEGER NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_soumissions_agent ON formation.soumissions(agent_name);
CREATE INDEX IF NOT EXISTS idx_soumissions_statut ON formation.soumissions(statut);
CREATE INDEX IF NOT EXISTS idx_soumission_details_soumission ON formation.soumission_details(soumission_id);
