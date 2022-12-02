const wooCommerceRequest = require('../lib/request');

const add = async (vendor, data) => {
    const url = `${vendor.platform.credentials.apiUrl + vendor.platform.credentials.apiVersion}/products`;
    const response = await wooCommerceRequest('post', url, url, vendor.platform.credentials.apiKey, vendor.platform.credentials.apiSecret, {}, data);

    return response.data;
};

const update = async (vendor, remoteProductId, data) => {
    const url = `${vendor.platform.credentials.apiUrl + vendor.platform.credentials.apiVersion}/products/${remoteProductId}`;
    const response = await wooCommerceRequest('post', url, url, vendor.platform.credentials.apiKey, vendor.platform.credentials.apiSecret, {}, data);

    return response.data;
};

module.exports = {
    add,
    update
};