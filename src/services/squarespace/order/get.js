const squareSpaceRequest = require('../lib/request');
const { SQUARESPACE_APIURL } = process.env;

const one = async (vendor, remoteOrderId) => {
    const url = `${SQUARESPACE_APIURL}/${vendor.credentials.apiVersion}/commerce/orders/${remoteOrderId}`;
    const response = await squareSpaceRequest('get', url, vendor.credentials.apiKey, vendor.credentials.apiSecret);

    return response.data;
};

const all = async (vendor) => {
    const url = `${SQUARESPACE_APIURL}/${vendor.credentials.apiVersion}/commerce/orders`;
    const response = await squareSpaceRequest('get', url, vendor.credentials.apiKey, vendor.credentials.apiSecret);

    return response.data;
};

module.exports = {
    one,
    all
};