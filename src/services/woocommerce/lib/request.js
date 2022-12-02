const axios = require('axios');

const send = async (method, url, key, secret, params = null, data = null) => {
  const config = {
    method,
    url,
    auth: {
      username: key,
      password: secret,
    },
    headers: {
      'Content-Type': 'application/json',
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
