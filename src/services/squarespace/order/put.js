const squareSpaceRequest = require('../lib/request');

const add = async (vendor, data) => {
    const url = `${vendor.platform.credentials.apiUrl + vendor.platform.credentials.apiVersion}/commerce/orders`;
    const response = await squareSpaceRequest('post', url, vendor.platform.credentials.apiKey, vendor.platform.credentials.apiSecret, {}, data);

    return response.data;
};

const update = async (vendor, remoteOrderId, data) => {
    // Square Space doesn't support order updates

    return {};
};

module.exports = {
    add,
    update
};