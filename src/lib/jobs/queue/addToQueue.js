const { productPublishShopifyQueue, productPublishShopifyQueue2 } = require(".");
const constVar  = require("../../../config/constant");

const AddJobPublishProductToShopify = async (productId) => {
  return productPublishShopifyQueue.add(
    { id: productId },
    {
      jobId: productId,
      attempts: constVar.qeueue.default_attempts,
      // timeout: DEFAULT_TIMEOUT,
    }
  );
}

const AddJobPublishProductToShopify2 = async (productId) => {
  return productPublishShopifyQueue2.add(
    { id: productId },
    {
      // jobId: productId,
      attempts: constVar.qeueue.default_attempts,
      // timeout: DEFAULT_TIMEOUT,
    }
  );
}

// const AddJobCallTodos = async (id) => {
//   return todosQueue.add(
//     { id: id },
//     {
//       jobId: id,
//       attempts: constVar.qeueue.default_attempts,
//     }
//   );
// }

module.exports = {
  AddJobPublishProductToShopify,
  AddJobPublishProductToShopify2,
  // AddJobCallTodos,
}