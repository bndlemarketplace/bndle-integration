const vendorModel = require('../../../models/vendor.model');
const userModel = require('../../../models/user.model');
const shopifyRequest = require('./request');
// tmp
apiVersion = '2022-07';
class Webhooks {
  constructor() {}

  isWebhookRegistered(webhooks, event) {
    if (Array.isArray(webhooks)) {
      for (const webhook of webhooks) {
        if (webhook.event === event) {
          return true;
        }
      }
    }
    return false;
  }

  async registerWebhook(vendor, event, endpoint) {
    if (!vendor?.credentials?.shopName || !vendor?.credentials?.accessToken) {
      return;
    }

    // check if the endpoint is already registered
    if (!this.isWebhookRegistered(vendor.webhooks, event)) {
      const data = {
        webhook: {
          topic: event,
          address: endpoint,
          format: 'json',
        },
      };
      // register the webhook
      const url = `https://${vendor.credentials.shopName}/admin/api/${apiVersion}/webhooks.json`;
      const response = await shopifyRequest('post', url, vendor.credentials.accessToken, {}, data).catch((e) => {
        // console.log(e);
        // console.log(e.response.data.errors);
      });

      if (response) {
        const webhookLogData = {
          id: response.data.webhook.id,
          event: event,
          endpointUrl: endpoint,
          isActive: true,
        };

        // save the
        // await userModel
        //   .updateOne({ _id: vendor._id }, { $push: { webhooks: webhookLogData } }, { upsert: true }, function (resp, error) {
        //     console.log(resp);
        //   })
        //   .clone()
        //   .catch((e) => {
        //     console.log(e);
        //   });
      }
    }
  }

  async deRegisterWebhook(id) {}

  async getRemoteWebhooks(vendor) {
    if (!vendor?.credentials?.shopName || !vendor?.credentials?.accessToken) {
      return;
    }
    const url = `https://${vendor.credentials.shopName}/admin/api/${apiVersion}/webhooks.json`;
    const response = await shopifyRequest('get', url, vendor.credentials.accessToken).catch((e) => {
      console.log(e);
    });

    return response.data.webhooks;
  }

  async deleteAllRemoteWebhooks(vendor) {
    try {
      const webhooks = await this.getRemoteWebhooks(vendor);
      console.log('vendor?.credentials', vendor?.credentials);
      if (!vendor?.credentials?.shopName || !vendor?.credentials?.accessToken) {
        return;
      }
      for (const webhook of webhooks) {
        const url = `https://${vendor.credentials.shopName}/admin/api/${apiVersion}/webhooks/${webhook.id}.json`;
        const response = await shopifyRequest('delete', url, vendor.credentials.accessToken).catch((e) => {
          // console.log(e);
        });
      }
    } catch (err) {
      return;
    }
  }

  async fulfillments(vendor, orderId) {
    try {
      const url = `https://${vendor.credentials.shopName}/admin/api/${apiVersion}/orders/${orderId}/fulfillment_orders.json`;
      const response = await shopifyRequest('get', url, vendor.credentials.accessToken, {});
      return response.data.fulfillment_orders;
    } catch (err) {
      console.log(err);
    }
  }

  async registerAll(vendor) {
    // register all webhook events

    // orders
    await this.registerWebhook(vendor, 'orders/create', `${process.env.APP_INTEGRATION_BASE_URL}'webhooks/orders/create`);
    await this.registerWebhook(vendor, 'orders/updated', `${process.env.APP_INTEGRATION_BASE_URL}'webhooks/orders/updated`);
    await this.registerWebhook(
      vendor,
      'orders/cancelled',
      `${process.env.APP_INTEGRATION_BASE_URL}'webhooks/orders/cancelled`
    );
    await this.registerWebhook(
      vendor,
      'orders/fulfilled',
      `${process.env.APP_INTEGRATION_BASE_URL}'webhooks/orders/fulfilled`
    );
    await this.registerWebhook(
      vendor,
      'orders/partially_fulfilled',
      `${process.env.APP_INTEGRATION_BASE_URL}'webhooks/orders/partially-fulfilled`
    );
    // products
    await this.registerWebhook(
      vendor,
      'products/create',
      `${process.env.APP_INTEGRATION_BASE_URL}'webhooks/products/create`
    );
    await this.registerWebhook(
      vendor,
      'products/update',
      `${process.env.APP_INTEGRATION_BASE_URL}'webhooks/products/update`
    );
  }
}

module.exports = Webhooks;
