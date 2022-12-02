const axios = require('axios');
const logger = require('../../config/logger');
const User = require('../../models/user.model');
const Adapter = require('./lib/adapter');
const ApiError = require('../../utils/ApiError');

const wooCommerceProductSync = async (userId) => {
  try {
    const userData = await User.findById(userId);
    axios({
      method: 'get',
      url: `${userData.credentials.shopName}/wp-json/wc/v3/products?consumer_key=${userData.credentials.apiKey}&consumer_secret=${userData.credentials.apiSecret}`,
      headers: { 'Content-Type': 'application/json' },
    })
      .then(async (response) => {
        // handle success
        let products = response.data;
        await Adapter.convertRemoteProductToPlatformProduct(products, userData);
      })
      .catch(function (error) {
        throw new ApiError(500, 'something went wrong');
      });
  } catch (err) {
    console.log(err);
    throw new ApiError(500, 'something went wrong');
  }
};

module.exports = {
  wooCommerceProductSync,
};
