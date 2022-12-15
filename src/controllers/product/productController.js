const cornServices = require('../../cornJob/shopifyCorn');
const catchAsync = require('../../utils/catchAsync');
const ApiError = require('../../utils/ApiError');
const wooCommerceService = require('../../services/woocommerce/wooCommerceService');
const wixService = require('../../services/wix/wixService');
const squarespaceService = require('../../services/squarespace/squarespaceService');

const initialProductSyncShopify = catchAsync(async (req, res) => {
  const vendorId = req.body.vendorID;
  if (req.body.productSource == 'shopify') await cornServices.initialProductSync(vendorId);
  // else if(req.body.productSource == 'woocommerce')
  if (req.body.productSource === 'wix') await wixService.wixProductSync(vendorId);
  // else await wooCommerceService.wooCommerceProductSync(vendorId);
  if (req.body.productSource === 'squarespace') await squarespaceService.squarespaceProductSync(vendorId);

  if (req.body.productSource === 'woocommerce') await wooCommerceService.wooCommerceProductSync(vendorId);
 
  return res.status(200).jsend.success({ message: 'success' });
});

const publishProductToShopify = catchAsync(async (req, res) => {
  const { productsId, productStatus } = req.body;
  if (productStatus === 'PUBLISHED') {
    const data = await cornServices.publishProductToShopify(productsId);
    if (data == true) {
      return res.status(200).jsend.success({ message: ' product published successfully' });
    } else {
      return res.status(500).jsend.error({ message: 'something went wrong' });
    }
  } else {
    const data = await cornServices.unpublishProductFromShopify(productsId);
    if (data === true) {
      return res.status(200).jsend.success({ message: ' product unpublished successfully' });
    } else {
      return res.status(500).jsend.error({ message: 'something went wrong' });
    }
  }
});

module.exports = {
  initialProductSyncShopify,
  publishProductToShopify,
};
