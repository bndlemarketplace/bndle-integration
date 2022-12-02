class Adapter {
  convertRemoteProductToPlatformProduct(product) {
    let platformProduct = {}; // should be a platfrom product model instance
    platformProduct.name = product.title;
    platformProduct.sku = product.sku;
    platformProduct.remoteProductId = product.id;
    return platformProduct;
  }

  convertPlatformProductToRemoteProduct(product) {
    const remoteProduct = {}; // should be a platfrom product model instance

    return remoteProduct;
  }

  convertRemoteOrderToPlatformOrder(order) {
    const platformOrder = {}; // should be a platfrom order model instance

    return platformOrder;
  }

  convertPlatformOrderToRemoteOrder(order) {
    const remoteOrder = {}; // should be a remote order model instance

    return remoteOrder;
  }
}

module.exports = Adapter;
