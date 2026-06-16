const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'config.local.json');

function read() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    }
  } catch { }
  return {};
}

function write(data) {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function getApiConfig() {
  const file = read();
  return {
    apm: {
      url: file.apm?.url || process.env.APM_API_URL || 'https://api.ivry.local',
      key: file.apm?.key || process.env.APM_API_KEY || '',
    },
    hubdsi: {
      url: file.hubdsi?.url || process.env.HUBDSI_API_URL || '',
      key: file.hubdsi?.key || process.env.HUBDSI_API_KEY || '',
      path: file.hubdsi?.path || '/api/admin/rh/organisation-chart',
      encadrantsPath: file.hubdsi?.encadrantsPath || '/api/admin/rh/encadrants',
    },
  };
}

function getServiceFormation() {
  const file = read();
  const list = file.serviceFormation || [];
  if (!Array.isArray(list)) return [];
  return list.filter(function(e) { return typeof e === 'string'; }).map(function(e) { return e.toLowerCase(); });
}

function isServiceFormation(email) {
  if (!email) return false;
  return getServiceFormation().includes(email.toLowerCase());
}

function setServiceFormation(emails) {
  const file = read();
  file.serviceFormation = emails;
  write(file);
}

function getPageConfig() {
  const file = read();
  return {
    message_general: file.message_general || '',
    description_collecte: file.description_collecte || 'Formulaire de collecte des besoins en formation',
    description_traitement: file.description_traitement || 'Traitement et validation des demandes de formation',
    description_recapitulatif: file.description_recapitulatif || 'Récapitulatif des demandes de formation',
  };
}

module.exports = { read, write, getApiConfig, getServiceFormation, setServiceFormation, getPageConfig, isServiceFormation };
