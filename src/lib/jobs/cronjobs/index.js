module.exports = (agenda) => ({
  create: require('./create')(agenda),
  updateProductSQ: require('./udpateProductSquarespace')(agenda),
  generateXMLMerchantFile : require('./generateXMLMerchantFile')(agenda),
  syncAllShopifyVendorProduct: require('./syncShopifyProduct')(agenda),
});
