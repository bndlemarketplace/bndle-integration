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
    for (let i = 0; i < allVendors.length; i++) {
      vendor = allVendors[i];
      console.log("🚀 ~ file: shopifyService.js:28 ~ syncAllShopifyProducts ~ vendor:", vendor)
      console.log('=vendor email=', vendor.email);
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
                console.log("nextPageParameters==>>", products.nextPageParameters)
                for (let index = 0; index < products.length; index++) {
                  product = products[index];
                  console.log('product==>>', product.title, product.id);
                  const dbProduct = await Product.findOne({ venderProductPlatformId: product.id }).lean();
                  console.log("dbProduct==>>", dbProduct.title, dbProduct.status)
                  // create product
                  if (dbProduct && (dbProduct.status === 'PUBLISHED' || dbProduct.status === 'ENABLED')) {
                    await cornServices.createUpdateProduct(product, 'update', vendor._id);
                  } else {
                    // await cornServices.createUpdateProduct(product, 'create', vendor._id);
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
        })().catch(async (err) => {
          console.log('===err===', err);
          // logger.error(err);
          const loggerPayload = {
            title: 'Update vendor product',
            type: 'publish',
            logs: err.message,
            level: 'error',
          };
          await LoggerService.createLogger(loggerPayload);
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
    const loggerPayload = {
      title: 'Update vendor product(catch)',
      type: 'publish',
      logs: err.message,
      level: 'error',
    };
    await LoggerService.createLogger(loggerPayload);
    logger.error('Sync shopify product Error while running cron : ' + ((e || {}).config || {}).url);
    logger.error('Sync shopify product Error while running cron : ' + (((e || {}).response || {}).data || {}).message);
  }
};

module.exports = {
  syncAllShopifyProducts,
};
