const axios = require('axios');

const send = async (method, url, key, secret, params = null, data = null) => {
  const config = {
    method,
    url,
    headers: {
      'Content-Type': 'application/json',
      Authorization: key,
      'Idempotency-Key': secret
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
