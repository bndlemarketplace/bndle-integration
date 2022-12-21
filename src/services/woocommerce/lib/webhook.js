const WooCommerceAPI = require('woocommerce-api');
const logger = require('../../../config/logger');
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

  async registerWebhook(vendor, eventName, eventTopic, endpoint) {
    logger.info(`vendor, eventName, eventTopic, endpoint ${vendor}, ${eventName}, ${eventTopic}, ${endpoint}`);

    if (!this.isWebhookRegistered(vendor.webhooks, eventTopic)) {
      const data = {
        webhook: {
          topic: eventTopic,
          address: endpoint,
          format: 'json',
        },
      };

      const WooCommerce = new WooCommerceAPI({
        url: vendor.credentials.shopName,
        consumerKey: vendor.credentials.apiKey,
        consumerSecret: vendor.credentials.apiSecret,
        version: 'v3',
      });

      const tempData = {
        webhook: {
          name: eventName,
          topic: eventTopic,
          delivery_url: endpoint,
          api_version: 3,
        },
      };

      // register the webhook
      WooCommerce.post('webhooks', tempData, function (err, data, res) {
        console.log(res);
      });
    }
  }
}

module.exports = Webhooks;
