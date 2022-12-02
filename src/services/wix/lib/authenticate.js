const axios = require('axios');

const authenticate = async (storeUrl, username, password, code) => {
  const accessToken = { key: '', token: '' };

  const authResponse = axios.post('https://www.wixapis.com/oauth/access', {
    grant_type: 'authorization_code',
    client_id: username,
    client_secret: password,
    code,
  }, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  accessToken.key = username;
  accessToken.token = authResponse.data.access_token;

  return accessToken;
};

module.exports = {
  authenticate,
};
