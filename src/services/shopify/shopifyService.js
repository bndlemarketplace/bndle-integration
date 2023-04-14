const Shopify = require('shopify-api-node');
const httpStatus = require('http-status');
const logger = require('../../config/logger');
const constVer = require('../../config/constant');
const ApiError = require('../../utils/ApiError');
const cornServices = require('../../cornJob/shopifyCorn');
const shopifyRequest = require('../../services/shopify/lib/request');
const LoggerService = require('../../services/logger.service');
const { Product, User } = require('../../models');

// 63e9dd5b4229fe58b04f117c
const syncAllShopifyProducts = async (vendorId = '', productId = '') => {
  console.log('===sync_product_shopify==');

  const allVendors = vendorId
  ? await User.find(
      { _id: vendorId, connectionType: constVer.model.product.productSourceEnum[1] },
      { credentials: 1, name: 1, connectionType: 1 }
    ).lean()
  : await User.find(
      { connectionType: constVer.model.product.productSourceEnum[1] },
      { credentials: 1, name: 1, connectionType: 1 }
    ).lean();


  for (let index = 0; index < allVendors.length; index++) {
    const user = allVendors[index];

    const dbProducts = await Product.find({
      vendorId: user._id,
    }).lean();

    if (user.connectionType === constVer.model.product.productSourceEnum[1]) {

      for (let index = 0; index < dbProducts.length; index++) {
        try {
          const dbProduct = dbProducts[index];
          // console.log('==dbProduct===shopify', dbProduct);
          const url = `https://${user.credentials.shopName}/admin/api/2022-01/products/${dbProduct.venderProductPlatformId}.json`;
          const response = await shopifyRequest('get', url, user.credentials.accessToken).catch((e) => {
            console.log(e);
          });

          const product = response.data.product;
          if (dbProduct && (dbProduct.status === 'PUBLISHED' || dbProduct.status === 'ENABLED')) {
            await cornServices.createUpdateProduct(product, 'update', user._id);
          } else {
            await cornServices.createUpdateProduct(product, 'create', user._id);
          }
        } catch (error) {
          logger.error(error);
        }
      }
    }
  }
};

module.exports = {
  syncAllShopifyProducts,
};
