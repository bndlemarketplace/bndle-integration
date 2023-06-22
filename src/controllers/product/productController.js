const cornServices = require('../../cornJob/shopifyCorn');
const catchAsync = require('../../utils/catchAsync');
const ApiError = require('../../utils/ApiError');
const wooCommerceService = require('../../services/woocommerce/wooCommerceService');
const wixService = require('../../services/wix/wixService');
const squarespaceService = require('../../services/squarespace/squarespaceService');
const { User, Product } = require('../../models');
const shopifyRequest = require('../../services/shopify/lib/request');
const { syncAllShopifyProducts } = require('../../services/shopify/shopifyService');

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

const productUpdateShopify = async (req,res) => {
  try {
    let ids;
    const vendorId = req.body.vendorId;
    // console.log("==vendorId==",vendorId)
    ids = req.body.productId;
    // console.log('---ids', ids);
    const dbProducts = await Product.find({
      _id: ids,
    }).lean();
    const user = await User.findOne({
      _id: vendorId,
      connectionType: { $in: ['shopify', 'wix', 'woocommerce', 'squarespace'] },
    }).lean();
    if (user.connectionType === 'wix') {
      for (let index = 0; index < dbProducts.length; index++) {
        const dbProduct = dbProducts[index];
        // console.log("==dbProduct===wix",dbProduct)
        await wixService.createUpdateProduct(dbProduct.venderProductPlatformId, 'update', vendorId);
      }
    }
    if(user.connectionType === 'woocommerce'){
      for (let index = 0; index < dbProducts.length; index++) {
        const dbProduct = dbProducts[index];
        // console.log('==dbProduct==woocommerce', dbProduct);
        let product = await wooCommerceService.woocommerceProduct(user.credentials, dbProduct.venderProductPlatformId);
        product = product.data;
        // console.log('=product=', product);
        await wooCommerceService.createUpdateProduct( product, vendorId)
      }
    }
    if (user.connectionType === 'shopify') {
      for (let index = 0; index < dbProducts.length; index++) {
        const dbProduct = dbProducts[index];
        // console.log('==dbProduct===shopify', dbProduct);
        const url = `https://${user.credentials.shopName}/admin/api/2022-01/products/${dbProduct.venderProductPlatformId}.json`;
        const response = await shopifyRequest('get', url, user.credentials.accessToken).catch((e) => {
          console.log(e);
        });

        const product = response.data.product;
        if (dbProduct.status === 'PUBLISHED') {
          await cornServices.createUpdateProduct(product, 'update', vendorId);
        } else {
          await cornServices.createUpdateProduct(product, 'create', vendorId);
        }
      }
    }
    if (user.connectionType === 'squarespace') {
      for (let index = 0; index < dbProducts.length; index++) {
        const dbProduct = dbProducts[index];
        await squarespaceService.updateAllVendorProducts(vendorId, dbProduct.venderProductPlatformId);
      }
    }
    return res.status(200).jsend.success({ message: 'success' });
  } catch (err) {
    console.log(err);
  }
};

const deleteAlgoliaProduct = async (req,res) => {
  // const dbProducts = await Product.find({
  //   status: "PUBLISHED",
  // }).lean();
  // console.log("🚀 ~ file: productController.js:107 ~ deleteAlgoliaProduct ~ dbProducts.length:", dbProducts.length)
  // for (let index = 0; index < dbProducts.length; index++) {
  //   try {
  //     console.log("🚀 ~ file: productController.js:108 ~ deleteAlgoliaProduct ~ index:", index)
  //     const element = dbProducts[index];
  //     if(element.bndleId) {
  //       await cornServices.deleteProductAlgolia(element.bndleId)
  //     }
  //   } catch (error) {
  //     console.log("🚀 ~ file: productController.js:113 ~ deleteAlgoliaProduct ~ error:", error)
  //   }
  // }

  // await cornServices.deleteProductAlgolia("8195892183205")
  await syncAllShopifyProducts()
  return res.status(200).jsend.success({ message: 'success' });
}

module.exports = {
  initialProductSyncShopify,
  publishProductToShopify,
  productUpdateShopify,
  deleteAlgoliaProduct
};
