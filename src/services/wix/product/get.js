const wixRequest = require("../lib/request");

const one = async (vendor, remoteProductId) => {
    const url = `${vendor.platform.credentials.apiUrl + vendor.platform.credentials.apiVersion}/products/${remoteProductId}`;
    const response = await wixRequest('get', url, vendor.platform.credentials.accessToken);

    return response.data.product;
};

const all = async (vendor) => {
    const url = `${vendor.platform.credentials.apiUrl + vendor.platform.credentials.apiVersion}/products/query`;
    const response = await wixRequest('post', url, vendor.platform.credentials.accessToken, null, {});

    return response.data.products;
};

module.exports = {
    one,
    all
};