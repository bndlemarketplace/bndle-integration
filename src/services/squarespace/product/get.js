const squareSpaceRequest = require("../lib/request");

const one = async (vendor, remoteProductId) => {
    const url = `${vendor.platform.credentials.apiUrl + vendor.platform.credentials.apiVersion}/commerce/products/${remoteProductId}`;
    const response = await squareSpaceRequest('get', url, vendor.platform.credentials.apiKey, vendor.platform.credentials.apiSecret);

    return response.data.products;
};

const all = async (vendor) => {
    const url = `${vendor.platform.credentials.apiUrl + vendor.platform.credentials.apiVersion}/commerce/products`;
    const response = await squareSpaceRequest('get', url, vendor.platform.credentials.apiKey, vendor.platform.credentials.apiSecret);

    return response.data.products;
};

module.exports = {
    one,
    all
};