module.exports = (agenda) => ({
  create: require('./create')(agenda),
  updateProductSQ: require('./udpateProductSquarespace')(agenda),
  syncAllShopifyVendorProduct: require('./syncShopifyProduct')(agenda),
});
