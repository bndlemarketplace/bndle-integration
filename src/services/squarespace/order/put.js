const squareSpaceRequest = require('../lib/request');
const { SQUARESPACE_APIURL } = process.env;

const add = async (vendor, data) => {
    const url = `${SQUARESPACE_APIURL}/1.0/commerce/orders`;
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