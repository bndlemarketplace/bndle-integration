const wixRequest = require('../lib/request');

const add = async (vendor, data) => {
    const url = `${vendor.platform.credentials.apiUrl + vendor.platform.credentials.apiVersion}/products`;
    const response = await wixRequest('post', url, vendor.platform.credentials.accessToken, {}, data);

    return response.data.product;
};

const update = async (vendor, remoteProductId, data) => {
    const url = `${vendor.platform.credentials.apiUrl + vendor.platform.credentials.apiVersion}/products/${remoteProductId}`;
    const response = await wixRequest('patch', url, vendor.platform.credentials.accessToken, {}, data);

    return response.data.product;
};

module.exports = {
    add,
    update
};