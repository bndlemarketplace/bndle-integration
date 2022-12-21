const squareSpaceRequest = require("../lib/request");
const { SQUARESPACE_APIURL } = process.env;

const one = async (vendor, variantId) => {
    const url = `${SQUARESPACE_APIURL}/1.0/commerce/inventory/${variantId}`;
    const response = await squareSpaceRequest('get', url, vendor.credentials.apiKey, vendor.credentials.apiSecret);
    return response.data;
};

const all = async (vendor, cursor) => {
    const url = `${SQUARESPACE_APIURL}/1.0/commerce/inventory?cursor=${cursor}`;
    const response = await squareSpaceRequest('get', url, vendor.credentials.apiKey, vendor.credentials.apiSecret);
    return response.data;
};

module.exports = {
    one,
    all
};