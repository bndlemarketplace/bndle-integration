const shopifyRequest = require('../lib/request');

const one = async (vendor, remoteOrderId) => {
  const url = `${vendor.platform.credentials.apiUrl + vendor.platform.credentials.apiVersion}/orders/${remoteOrderId}.json`;
  const response = await shopifyRequest('get', url, vendor.platform.credentials.apiPassword);

  return response.data.order;
};

const all = async (vendor) => {
  const url = `${vendor.platform.credentials.apiUrl + vendor.platform.credentials.apiVersion}/orders.json`;
  const response = await shopifyRequest('get', url, vendor.platform.credentials.apiPassword);

  return response.data.orders;
};

module.exports = {
  one,
  all,
};
