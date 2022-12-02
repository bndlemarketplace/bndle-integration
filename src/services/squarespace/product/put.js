const squareSpaceRequest = require('../lib/request');

const add = async (vendor, data) => {
    const url = `${vendor.platform.credentials.apiUrl + vendor.platform.credentials.apiVersion}/commerce/products`;
    const response = await squareSpaceRequest('post', url, vendor.platform.credentials.apiKey, vendor.platform.credentials.apiSecret, {}, data);

    return response.data;
};

const update = async (vendor, remoteProductId, data) => {
    const url = `${vendor.platform.credentials.apiUrl + vendor.platform.credentials.apiVersion}/commerce/products/${remoteProductId}`;
    const response = await squareSpaceRequest('post', url, vendor.platform.credentials.apiKey, vendor.platform.credentials.apiSecret, {}, data);

    return response.data;
};

module.exports = {
    add,
    update
};