const logger = require('../../../config/logger');
const { Chat } = require('../../../models');

module.exports = async (agenda) => {
  agenda.define('remove_old_messages', {
    concurrency: 4, lockLifetime: 1 * 60 * 1000, priority: 1,
  }, async () => {
    try {
        console.log('remove_old_messages')
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const count = await Chat.count({ createdAt: { $lte: yesterday } });
        console.log("🚀 ~ file: removeOldMessage.js:13 ~ module.exports= ~ count:", count)
        Chat.deleteMany({ createdAt: { $lte: yesterday } }, (err) => {
            if (err) {
                console.error("Error deleting documents:", err);
            } else {
                console.log("Documents deleted successfully.");
            }
        });
    } catch (err) {
      logger.info('Error while running shopify CRON for initializing token : ', err);
    }
  });
};
