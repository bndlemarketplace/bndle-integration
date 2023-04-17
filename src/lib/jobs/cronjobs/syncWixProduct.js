const { syncAllProducts } = require('../../../services/wix/wixService');
const logger = require('../../../config/logger');

module.exports = async (agenda) => {
  agenda.define('update_product_wix', {
    concurrency: 4, lockLifetime: 1 * 60 * 1000, priority: 1,
  }, async (job) => {
    try {
      console.log('wix cron for sync all product')
      syncAllProducts();
    } catch (err) {
      logger.info('Error while running shopify wix for initializing token : ', err);
    }
  });
};
