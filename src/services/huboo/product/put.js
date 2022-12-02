const wooCommerceRequest = require('../lib/request');

const add = async (vendor, data) => {
    const url = `${vendor.platform.credentials.apiUrl + vendor.platform.credentials.apiVersion}/products`;
    const response = await wooCommerceRequest('post', url, vendor.platform.credentials.apiPassword, {}, data);

    return response.data.product;
};

const update = async (vendor, remoteProductId, data) => {
    const url = `${vendor.platform.credentials.apiUrl + vendor.platform.credentials.apiVersion}/products/${remoteProductId}`;
    const response = await wooCommerceRequest('post', url, vendor.platform.credentials.apiPassword, {}, data);

    return response.data.product;
};

module.exports = {
    add,
    update
};