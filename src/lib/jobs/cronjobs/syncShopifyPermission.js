const { getPermissionFile } = require('../../../services/shopify/shopifyService');
const logger = require('../../../config/logger');

module.exports = async (agenda) => {
  agenda.define('sync_shopify_permission', {
    concurrency: 4, lockLifetime: 1 * 60 * 1000, priority: 1,
  }, async (job) => {
    try {
      console.log('shopify sync_shopify_permission')
      getPermissionFile();
    } catch (err) {
      logger.info('Error while running shopify CRON for initializing token : ', err);
    }
  });
};
