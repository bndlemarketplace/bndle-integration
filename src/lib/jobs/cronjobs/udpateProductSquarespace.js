const { updateAllVendorProducts } = require('../../../services/squarespace/squarespaceService');
const logger = require('../../../config/logger');

module.exports = async (agenda) => {
  agenda.define('update_product_sq', {
    concurrency: 4, lockLifetime: 1 * 60 * 1000, priority: 1,
  }, async (job) => {
    try {
      console.log('called cron')
      // updateAllVendorProducts();
    } catch (err) {
      logger.info('Error while running CRON for initializing token : ', err);
    }
  });
};
