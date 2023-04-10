const WooCommerceAPI = require('woocommerce-api');
const logger = require('../../../config/logger');
const axios = require('axios');
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
    const WooCommerce = new WooCommerceAPI({
      url: `https://${vendor.credentials.shopName}`,
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

  async deregisterWoocoommerceWebhook(vendor) {
    const data = await axios({
      method: 'get',
      url: `https://${vendor.credentials.shopName}/wp-json/wc/v3/webhooks/?consumer_key=${vendor.credentials.apiKey}&consumer_secret=${vendor.credentials.apiSecret}`,
      headers: { 'Content-Type': 'application/json' },
    });
    const WooCommerce = new WooCommerceAPI({
      url: `https://${vendor.credentials.shopName}`,
      consumerKey: vendor.credentials.apiKey,
      consumerSecret: vendor.credentials.apiSecret,
      version: 'v3',
    });
    for (let index = 0; index < data.data.length; index++) {
      const element = data.data[index];
      WooCommerce.delete(`webhooks/${element.id}`, function (err, data, res) {
        console.log('res-->', res);
      });
    }
  }
}

module.exports = Webhooks;
