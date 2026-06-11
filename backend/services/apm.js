const axios = require('axios');
const https = require('https');
const config = require('./config');

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

function getClient() {
  const { apm } = config.getApiConfig();
  return axios.create({
    baseURL: apm.url,
    headers: { 'X-API-KEY': apm.key },
    httpsAgent,
  });
}

async function authentifierAgent(username, password) {
  try {
    const { data } = await getClient().post('/api/v1/ad/authenticate', { username, password });
    return data;
  } catch (err) {
    return { success: false, error: err.response?.data?.error || err.message };
  }
}

async function rechercherAgent(query) {
  try {
    const { data } = await getClient().get('/api/v1/ad/search', { params: { q: query } });
    return data;
  } catch (err) {
    return { error: err.response?.data?.error || err.message };
  }
}

async function envoyerMail(to, subject, content, footer = {}) {
  try {
    const { data } = await getClient().post('/api/v1/mail/send', {
      to,
      subject,
      content,
      footer1: footer.footer1 || 'Ville d\'Ivry-sur-Seine',
      footer2: footer.footer2 || 'Direction des Systèmes d\'Information',
      footer3: footer.footer3 || 'formation@ivry94.fr',
      footerColor: footer.footerColor || '#0055A4',
    });
    return data;
  } catch (err) {
    return { error: err.response?.data?.error || err.message };
  }
}

module.exports = { authentifierAgent, rechercherAgent, envoyerMail };
