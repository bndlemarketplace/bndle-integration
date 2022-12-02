const wixRequest = require("../lib/request");

const add = async (vendor, data) => {
    const url = `${vendor.platform.credentials.apiUrl + vendor.platform.credentials.apiVersion}/orders`;
    const response = await wixRequest('post', url, vendor.platform.credentials.accessToken, {}, data);

    return response.data.order;
};

const update = async (vendor, remoteOrderId, data) => {
    // Wix does not support order updates via the api

    return {};
};

module.exports = {
    add,
    update
};