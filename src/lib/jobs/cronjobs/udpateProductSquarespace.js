const { updateAllVendorProducts, deleteVendorProducts } = require('../../../services/squarespace/squarespaceService');
const logger = require('../../../config/logger');

module.exports = async (agenda) => {
  agenda.define('update_product_sq', {
    concurrency: 4, lockLifetime: 1 * 60 * 1000, priority: 1,
  }, async (job) => {
    try {
      console.log('called create squarespace cron')
      updateAllVendorProducts();
    } catch (err) {
      logger.info('Error while running CRON for initializing token : ', err);
    }
  });

  agenda.define('delete_product_sq', {
    concurrency: 4, lockLifetime: 1 * 60 * 1000, priority: 1,
  }, async (job) => {
    try {
      console.log('called delete squarespace cron')
      deleteVendorProducts();
    } catch (err) {
      logger.info('Error while running CRON for initializing token : ', err);
    }
  });
};
