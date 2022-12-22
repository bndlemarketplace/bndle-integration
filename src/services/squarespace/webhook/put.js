const squareSpaceRequest = require("../lib/request");
const { SQUARESPACE_APIURL } = process.env;

const subscribe = async (vendor, data) => {
    const url = `${SQUARESPACE_APIURL}/1.0/webhook_subscriptions`;
   
    const response = await squareSpaceRequest('post', url, vendor.credentials.accessToken, vendor.credentials.apiSecret, null, data);
    return response.data;
};

module.exports = {
    subscribe
};