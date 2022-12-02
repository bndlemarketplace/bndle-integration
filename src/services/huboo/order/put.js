const hubooRequest = require('../lib/request');

const add = async (vendor, data) => {
    const url = `${vendor.platform.credentials.apiUrl + vendor.platform.credentials.apiVersion}/order`;
    const response = await hubooRequest('post', url, vendor.platform.credentials.apiPassword, {}, data);

    return response.data;
};

const update = async (vendor, remoteOrderId, data) => {
    // Huboo doesn't support order updates

    return {};
};

module.exports = {
    add,
    update
};