const platformServiceFactory = require('../fulfilmentPlatformServiceFactory');
const userModel = require('../../models/user.model');

const registerAllWebhooksService = async (vendor) => {
  try {
    const platform = platformServiceFactory();
    await platform.webhooks.registerWebhook(
      vendor,
      'orders/updated',
      process.env.APP_INTEGRATION_BASE_URL + `v1/webhooks/${vendor._id}/orders/updated`
    );
    await platform.webhooks.registerWebhook(
      vendor,
      'orders/cancelled',
      process.env.APP_INTEGRATION_BASE_URL + `v1/webhooks/${vendor._id}/orders/cancelled`
    );
    await platform.webhooks.registerWebhook(
      vendor,
      'orders/fulfilled',
      process.env.APP_INTEGRATION_BASE_URL + `v1/webhooks/${vendor._id}/orders/fulfilled`
    );
    await platform.webhooks.registerWebhook(
      vendor,
      'orders/partially_fulfilled',
      process.env.APP_INTEGRATION_BASE_URL + `v1/webhooks/${vendor._id}/orders/partially-fulfilled`
    );
    // products
    await platform.webhooks.registerWebhook(
      vendor,
      'products/create',
      process.env.APP_INTEGRATION_BASE_URL + `v1/webhooks/${vendor._id}/products/create`
    );
    await platform.webhooks.registerWebhook(
      vendor,
      'products/update',
      process.env.APP_INTEGRATION_BASE_URL + `v1/webhooks/${vendor._id}/products/update`
    );

    return 'webhook registered successfully';
  } catch (error) {
    return 
    // error.message || 'Something went wrong';
  }
};

const deleteRemoteWebhooksService = async (vendor) => {
  const platform = platformServiceFactory();

  await platform.webhooks.deleteAllRemoteWebhooks(vendor);

  return { message: 'success' };
};

module.exports = {
  registerAllWebhooksService,
  deleteRemoteWebhooksService,
};
