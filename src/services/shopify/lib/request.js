const axios = require('axios');

const send = async (method, url, password, params = null, data = null) => {
  const config = {
    method,
    url,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': password,
    },
  };

  if (params !== null) {
    config.params = params;
  }

  if (method === 'post' && data !== null) {
    config.data = data;
  }
  const response = await axios(config);
  return response;
};

module.exports = send;
