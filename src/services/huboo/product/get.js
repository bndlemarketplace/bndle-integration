const wooCommerceRequest = require('../lib/request');

const one = async (vendor, remoteProductId) => {
    const url = `${vendor.platform.credentials.apiUrl + vendor.platform.credentials.apiVersion}/products/${remoteProductId}`;
    const response = await wooCommerceRequest('get', url, vendor.platform.credentials.apiPassword);

    return response.data.product;
};

const all = async (vendor) => {
    const url = `${vendor.platform.credentials.apiUrl + vendor.platform.credentials.apiVersion}/products`;
    const response = await wooCommerceRequest('get', url, vendor.platform.credentials.apiPassword);

    return response.data.products;
};

module.exports = {
    one,
    all
};