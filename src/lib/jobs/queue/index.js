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
  limiter: { max: 1, duration: 20000 } // max, duration, bouceBack, groupKey
};

const productPublishShopifyQueue = new Queue("PUBLISH_SHOPIFY_PRODUCT_ID", opts);
// const todosQueue = new Queue("TO_DO_LIST", opts);

module.exports = {
  productPublishShopifyQueue,
  todosQueue
};