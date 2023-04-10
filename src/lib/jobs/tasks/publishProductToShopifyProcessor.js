const cornServices = require('../../../cornJob/shopifyCorn');
const logger = require('../../../config/logger');

module.exports = async function ({ data }) {
  try {
    const productId = data.id;
    logger.info("processing job for " + productId);
    const res = await cornServices.publishProductToShopify(productId);

    if (!res) {
      throw new Error("Publish product to shopify job for id" + productId + " fails");
    } else {
      logger.info(productId + " : job published to shopify");
    }
  } catch (err) {
    logger.info(err);
    throw new Error("Unhandled error in tasks/publishProductToShopify2Processor.js", err);
  }
};
