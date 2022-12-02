const authenticate = async (storeUrl, username, password) => {
  const accessToken = { key: '', token: '' };

  // squarespace authenticates using the API KEY
  accessToken.key = username;
  accessToken.token = password;

  return accessToken;
};

module.exports = {
  authenticate,
};
