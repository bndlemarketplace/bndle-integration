const { syncAllProducts } = require('../../../services/squarespace/squarespaceService');
const logger = require('../../../config/logger');

module.exports = async (agenda) => {
  agenda.define('update_product_squareSpace', {
    concurrency: 4, lockLifetime: 1 * 60 * 1000, priority: 1,
  }, async (job) => {
    try {
      console.log('square space cron for sync all product')
      syncAllProducts();
    } catch (err) {
      logger.info('Error while running shopify square space for initializing token : ', err);
    }
  });
};
