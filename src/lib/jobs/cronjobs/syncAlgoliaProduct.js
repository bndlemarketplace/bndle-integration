const { syncAlgoliaProduct } = require('../../../services/shopify/shopifyService');
const logger = require('../../../config/logger');

module.exports = async (agenda) => {
  agenda.define('sync_algolia_product', {
    concurrency: 4, lockLifetime: 1 * 60 * 1000, priority: 1,
  }, async (job) => {
    try {
      console.log('sync_algolia_product')
      syncAlgoliaProduct();
    } catch (err) {
      logger.info('Error while running shopify CRON for initializing token : ', err);
    }
  });
};
