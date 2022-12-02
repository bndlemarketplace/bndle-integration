const wooCommerceRequest = require('../lib/request');

const one = async (vendor, remoteProductId) => {
    const url = `${vendor.platform.credentials.apiUrl + vendor.platform.credentials.apiVersion}/products/${remoteProductId}`;
    const response = await wooCommerceRequest('get', url, vendor.platform.credentials.apiKey, vendor.platform.credentials.apiSecret);

    return response.data;
};

const all = async (vendor) => {
    const url = `${vendor.platform.credentials.apiUrl + vendor.platform.credentials.apiVersion}/products`;
    const response = await wooCommerceRequest('get', url, vendor.platform.credentials.apiKey, vendor.platform.credentials.apiSecret);

    return response.data;
};

module.exports = {
    one,
    all
};