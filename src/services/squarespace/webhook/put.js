const squareSpaceRequest = require("../lib/request");
const { SQUARESPACE_APIURL, APP_INTEGRATION_BASE_URL } = process.env;

const subscribe = async (vendor) => {
    const url = `${SQUARESPACE_APIURL}/1.0/webhook_subscriptions`;
    const data = {
        endpointUrl: `${APP_INTEGRATION_BASE_URL}/v1/webhooks/${vendor._id}/squarespace/orders`,
        topics: [
            "order.create", "order.update"
        ]
    }
    const response = await squareSpaceRequest('post', url, vendor.credentials.accessToken, vendor.credentials.apiSecret, null, data);
    return response.data;
};

module.exports = {
    subscribe
};