const squareSpaceRequest = require('../lib/request');
const { SQUARESPACE_APIURL } = process.env;

const add = async (vendor, data) => {
    const url = `${SQUARESPACE_APIURL}/1.0/commerce/products`;
    const response = await squareSpaceRequest('post', url, vendor.platform.credentials.apiKey, vendor.platform.credentials.apiSecret, {}, data);

    return response.data;
};

const update = async (vendor, remoteProductId, data) => {
    const url = `${SQUARESPACE_APIURL}/1.0/commerce/products/${remoteProductId}`;
    const response = await squareSpaceRequest('post', url, vendor.platform.credentials.apiKey, vendor.platform.credentials.apiSecret, {}, data);

    return response.data;
};

module.exports = {
    add,
    update
};