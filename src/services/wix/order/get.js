const wixRequest = require("../lib/request");

const one = async (vendor, remoteOrderId) => {
    const url = `${vendor.platform.credentials.apiUrl + vendor.platform.credentials.apiVersion}/orders/${remoteOrderId}`;
    const response = await wixRequest('get', url, vendor.platform.credentials.accessToken);

    return response.data.order;
};

const all = async (vendor) => {
    const url = `${vendor.platform.credentials.apiUrl + vendor.platform.credentials.apiVersion}/orders/query`;
    const response = await wixRequest('post', url, vendor.platform.credentials.accessToken, null, {});

    return response.data.orders;
};

module.exports = {
    one,
    all
};