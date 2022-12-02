const shopifyRequest = require('../lib/request');

const add = async (vendor, data) => {
    const url = `${vendor.platform.credentials.apiUrl + vendor.platform.credentials.apiVersion}/orders.json`;
    const response = await shopifyRequest('post', url, vendor.platform.credentials.apiPassword, {}, data);

    return response.data.order;
};

const update = async (vendor, remoteOrderId, data) => {
    const url = `${vendor.platform.credentials.apiUrl + vendor.platform.credentials.apiVersion}/orders/${remoteOrderId}.json`;
    const response = await shopifyRequest('post', url, vendor.platform.credentials.apiPassword, {}, data);

    return response.data.order;
};

module.exports = {
    add,
    update
};