const mongoose = require('mongoose');
const Shopify = require('shopify-api-node');
const httpStatus = require('http-status');
const logger = require('../../config/logger');
const constVer = require('../../config/constant');
const ApiError = require('../../utils/ApiError');
const cornServices = require('../../cornJob/shopifyCorn');
const productService = require('../../services/product.service');
const shopifyRequest = require('../../services/shopify/lib/request');
const { Product, ProductVariants, VenderOrder, Order, User } = require('../../models');
const { AddJobPublishProductToShopify } = require('../../lib/jobs/queue/addToQueue');

// 63e9dd5b4229fe58b04f117c
const syncAllShopifyProducts = async (vendorId = '633bd2cf84763eba86fa4690', productId = '') => {
  console.log('===sync_product_shopify==');
  try {
    const allVendors = vendorId
      ? await User.find(
          { _id: vendorId, connectionType: constVer.model.product.productSourceEnum[1] },
          { credentials: 1, name: 1, connectionType: 1 }
        ).lean()
      : await User.find(
          { connectionType: constVer.model.product.productSourceEnum[1] },
          { credentials: 1, name: 1, connectionType: 1 }
        ).lean();

    let vendor;
    console.log('=allVendors=', allVendors);
    for (let i = 0; i < allVendors.length; i++) {
      vendor = allVendors[i];
      if (vendor.credentials) {
        const tmpClient = new Shopify({
          shopName: vendor.credentials.shopName,
          accessToken: vendor.credentials.accessToken,
          apiVersion: '2022-10',
        });
        (async () => {
          let params = { limit: 10 };
          do {
            const products = await tmpClient.product.list(params);
            try {
              // cursor = pagination.nextPageCursor;
              // console.log('products',products, products.length);
              if (products && products.length) {
                let product;
                for (let index = 0; index < products.length; index++) {
                  product = products[index];
console.log("product==>>",product.title)
                  const dbProduct = await Product.findOne({ venderProductPlatformId: product.id });
                  // console.log("==dbProduct=",dbProduct)
                  // create product
                  if (dbProduct && dbProduct.status === 'PUBLISHED') {
                    await cornServices.createUpdateProduct(product, 'update', vendor._id);
                  } else {
                    await cornServices.createUpdateProduct(product, 'create', vendor._id);
                  }
                }
              }
            } catch (e) {
              logger.error(e);
              logger.error('Sync shopify product Error while running cron : ' + ((e || {}).config || {}).url);
              logger.error(
                'Sync shopify product Error while running cron : ' + (((e || {}).response || {}).data || {}).message
              );
              continue;
            }
            params = products.nextPageParameters;
          } while (params !== undefined);
        })().catch((err) => {
          console.log("===err===",err)
          // logger.error(err);
          logger.error('Sync shopify product Error while running cron : ' + err);
          // throw new ApiError(402, err.message);
          // throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, err.message);
        });
        // const url = `https://${vendor.credentials.shopName}/admin/api/2022-01/products.json?limit=150`;
        // const response = await shopifyRequest('get', url, vendor.credentials.accessToken).catch((e) => {
        //   // console.log(e);
        // });

        // const products = response && response.data.products;
      }
    }
  } catch (e) {
    logger.error(e);
    logger.error('Sync shopify product Error while running cron : ' + ((e || {}).config || {}).url);
    logger.error('Sync shopify product Error while running cron : ' + (((e || {}).response || {}).data || {}).message);
  }
};

module.exports = {
  syncAllShopifyProducts,
};
