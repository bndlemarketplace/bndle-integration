const Redis = require("ioredis");
const Queue = require("bull");

let redisUrl = null;
if (process.env.REDIS_URL) {
  redisUrl = process.env.REDIS_URL;
}

const client = new Redis(redisUrl, { maxRetriesPerRequest: null, enableReadyCheck: false });
const subscriber = new Redis(redisUrl, { maxRetriesPerRequest: null, enableReadyCheck: false });

const opts = {
  createClient: function (type) {
    switch (type) {
      case "client":
        return client;
      case "subscriber":
        return subscriber;
      default:
        return new Redis(redisUrl, {
          maxRetriesPerRequest: null,
          enableReadyCheck: false
        });
    }
  },
  limiter: { max: 30, duration: 60000 } // max, duration, bouceBack, groupKey
};

const productPublishShopifyQueue = new Queue("PUBLISH_SHOPIFY_PRODUCT_ID", opts);
const productPublishShopifyQueue2 = new Queue("PUBLISH_SHOPIFY_PRODUCT_ID_2", opts);
// const todosQueue = new Queue("TO_DO_LIST", opts);

module.exports = {
  productPublishShopifyQueue,
  productPublishShopifyQueue2,
  // todosQueue
};