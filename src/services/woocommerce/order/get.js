const wooCommerceRequest = require('../lib/request');

const one = async (vendor, remoteOrderId) => {
    const url = `${vendor.platform.credentials.apiUrl + vendor.platform.credentials.apiVersion}/orders/${remoteOrderId}`;
    const response = await wooCommerceRequest('get', url, url, vendor.platform.credentials.apiKey, vendor.platform.credentials.apiSecret);

    return response.data;
};

const all = async (vendor) => {
    const url = `${vendor.platform.credentials.apiUrl + vendor.platform.credentials.apiVersion}/orders`;
    const response = await wooCommerceRequest('get', url, url, vendor.platform.credentials.apiKey, vendor.platform.credentials.apiSecret);

    return response.data;
};

module.exports = {
    one,
    all
};