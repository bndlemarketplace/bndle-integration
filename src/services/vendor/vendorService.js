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
    await platform.webhooks.registerWebhook(
      vendor,
      'products/delete',
      process.env.APP_INTEGRATION_BASE_URL + `v1/webhooks/${vendor._id}/products/delete`
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

const registerAllWoocommerceWebhooks = async (vendor) => {
  try {
    const platform = platformServiceFactory('woocommerce');

    // products
    // await platform.webhooks.registerWebhook(
    //   vendor,
    //   'Add product',
    //   'product.created',
    //   process.env.APP_BASE_URL + `v1/webhooks/${vendor._id}/woocommerce/products/create`
    // );
    await platform.webhooks.registerWebhook(
      vendor,
      'Update order',
      'order.updated',
      process.env.APP_INTEGRATION_BASE_URL + `v1/webhooks/${vendor._id}/woocommerce/orders/update`
    );

     await platform.webhooks.registerWebhook(
      vendor,
      'Product update',
      'product.updated',
      process.env.APP_INTEGRATION_BASE_URL + `v1/webhooks/${vendor._id}/woocommerce/products/update`
    );
    return 'webhook registered successfully';
  } catch (error) {
    return 
  }
};

module.exports = {
  registerAllWebhooksService,
  deleteRemoteWebhooksService,
  registerAllWoocommerceWebhooks,
};
