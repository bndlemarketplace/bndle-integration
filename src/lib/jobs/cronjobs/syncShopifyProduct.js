const { syncAllShopifyProducts } = require('../../../services/shopify/shopifyService');
const logger = require('../../../config/logger');

module.exports = async (agenda) => {
  agenda.define('sync_product_shopify', {
    concurrency: 4, lockLifetime: 1 * 60 * 1000, priority: 1,
  }, async (job) => {
    try {
      console.log('shopify cron for sync all product')
      syncAllShopifyProducts();
    } catch (err) {
      logger.info('Error while running shopify CRON for initializing token : ', err);
    }
  });
};
