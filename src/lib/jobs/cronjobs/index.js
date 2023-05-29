module.exports = (agenda) => ({
  create: require('./create')(agenda),
  updateProductSQ: require('./udpateProductSquarespace')(agenda),
  generateXMLMerchantFile : require('./generateXMLMerchantFile')(agenda),
  syncAllShopifyVendorProduct: require('./syncShopifyProduct')(agenda),
  syncWooCommerceProduct : require("./syncWooCommerceProduct")(agenda),
  syncWixProduct : require("./syncWixProduct")(agenda),
  syncSquareSpaceProduct : require("./syncSquareSpaceProduct")(agenda),
  syncShopifyPermission: require("./syncShopifyPermission")(agenda)
});
