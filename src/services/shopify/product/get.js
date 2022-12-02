const shopifyRequest = require('../lib/request');

const one = async (vendor, remoteProductId) => {
    const url = `${vendor.platform.credentials.apiUrl + vendor.platform.credentials.apiVersion}/products/${remoteProductId}.json`;
    const response = await shopifyRequest('get', url, vendor.platform.credentials.apiPassword);

    return response.data.product;
};

const all = async (vendor) => {
    const url = `${vendor.platform.credentials.apiUrl + vendor.platform.credentials.apiVersion}/products.json`;
    const response = await shopifyRequest('get', url, vendor.platform.credentials.apiPassword);

    return response.data.products;
};

module.exports = {
    one,
    all
};