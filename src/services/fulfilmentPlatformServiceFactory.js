const shopifyService = require('./shopify/index');
const woocommerceService = require('./woocommerce/index');
const squareSpaceService = require('./squarespace/index');
const wixService = require('./wix/index');
const hubooService = require('./huboo/index');

module.exports = (vendorPlatform) => {
  switch (vendorPlatform) {
    case 'huboo':
      return new hubooService();
    case 'squarespace':
      return new squareSpaceService();
    case 'wix':
      return new wixService();
    case 'woocommerce':
      return new woocommerceService();
    default:
      return new shopifyService();
  }
};
