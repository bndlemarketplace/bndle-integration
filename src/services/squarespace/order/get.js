const squareSpaceRequest = require('../lib/request');

const one = async (vendor, remoteOrderId) => {
    const url = `${vendor.platform.credentials.apiUrl + vendor.platform.credentials.apiVersion}/commerce/orders/${remoteOrderId}`;
    const response = await squareSpaceRequest('get', url, vendor.platform.credentials.apiKey, vendor.platform.credentials.apiSecret);

    return response.data.result;
};

const all = async (vendor) => {
    const url = `${vendor.platform.credentials.apiUrl + vendor.platform.credentials.apiVersion}/commerce/orders`;
    const response = await squareSpaceRequest('get', url, vendor.platform.credentials.apiKey, vendor.platform.credentials.apiSecret);

    return response.data;
};

module.exports = {
    one,
    all
};