const axios = require('axios');
const https = require('https');
const config = require('./config');

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

function getClient(token) {
  const { hubdsi } = config.getApiConfig();
  return axios.create({
    baseURL: hubdsi.url,
    headers: { Authorization: `Bearer ${token}`, 'X-API-Key': hubdsi.key },
    httpsAgent,
  });
}

async function getDirectionsServices(token) {
  const { hubdsi } = config.getApiConfig();
  try {
    const { data } = await getClient(token).get(hubdsi.path);
    return data;
  } catch (err) {
    const status = err.response?.status;
    const body = err.response?.data;
    console.error('[HubDSI]', status, JSON.stringify(body), `${hubdsi.url}${hubdsi.path}`);
    return {
      error: body?.error || body?.message || err.message,
      status,
      body,
    };
  }
}

async function getEncadrants(token) {
  const { hubdsi } = config.getApiConfig();
  try {
    const { data } = await getClient(token).get(hubdsi.encadrantsPath);
    return data;
  } catch (err) {
    const status = err.response?.status;
    const body = err.response?.data;
    console.error('[HubDSI]', status, JSON.stringify(body), `${hubdsi.url}${hubdsi.encadrantsPath}`);
    return {
      error: body?.error || body?.message || err.message,
      status,
      body,
    };
  }
}

module.exports = { getDirectionsServices, getEncadrants };
