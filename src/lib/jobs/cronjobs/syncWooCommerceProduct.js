const { syncAllProducts } = require('../../../services/woocommerce/wooCommerceService');
const logger = require('../../../config/logger');

module.exports = async (agenda) => {
  agenda.define('update_product_wc', {
    concurrency: 4, lockLifetime: 1 * 60 * 1000, priority: 1,
  }, async (job) => {
    try {
      console.log('wooCommerce cron for sync all product')
      syncAllProducts();
    } catch (err) {
      logger.info('Error while running shopify wooCommerce for initializing token : ', err);
    }
  });
};
