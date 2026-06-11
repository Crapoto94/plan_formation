const { getDirectionsServices } = require('../../services/hubdsi');
const config = require('../../services/config');

async function directionsServices(req, res) {
  const apiConfig = config.getApiConfig();
  const result = await getDirectionsServices(req.token);

  if (result.error) {
    console.error('[HubDSI]', result.error, 'URL:', apiConfig.hubdsi.url + apiConfig.hubdsi.path);
    return res.status(502).json({ error: result.error, config: { url: apiConfig.hubdsi.url, path: apiConfig.hubdsi.path } });
  }

  res.json(result);
}

module.exports = { directionsServices };
