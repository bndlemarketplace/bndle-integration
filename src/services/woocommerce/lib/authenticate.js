const authenticate = async (storeUrl, username, password) => {
  const accessToken = { key: '', token: '' };

  // woocommerce authenticates using the key and secret
  accessToken.key = username;
  accessToken.token = password;

  return accessToken;
};

module.exports = {
  authenticate,
};
