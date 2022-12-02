const hubooRequest = require('../lib/request');

const one = async (vendor, remoteOrderId) => {
    const url = `${vendor.platform.credentials.apiUrl + vendor.platform.credentials.apiVersion}/orders/${remoteOrderId}`;
    const response = await hubooRequest('get', url, vendor.platform.credentials.apiPassword);

    return response.data.order;
};

const all = async (vendor) => {
    const url = `${vendor.platform.credentials.apiUrl + vendor.platform.credentials.apiVersion}/orders`;
    const response = await hubooRequest('get', url, vendor.platform.credentials.apiPassword);

    return response.data.orders;
};

module.exports = {
    one,
    all
};