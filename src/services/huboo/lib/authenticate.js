const axios = require('axios');

const authenticate = async (storeUrl, username, password) => {
  const accessToken = { key: '', token: '' };

  // to simplify this implementation, the password is being used for authenticating requests
  // this should actually follow the oAuth flow and create a Session token
  accessToken.key = username;
  accessToken.token = password;

  return accessToken;
};

module.exports = {
  authenticate,
};
