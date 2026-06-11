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
  return file.serviceFormation || [];
}

function setServiceFormation(emails) {
  const file = read();
  file.serviceFormation = emails;
  write(file);
}

module.exports = { read, write, getApiConfig, getServiceFormation, setServiceFormation };
