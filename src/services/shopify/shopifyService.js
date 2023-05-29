const Shopify = require('shopify-api-node');
const httpStatus = require('http-status');
const logger = require('../../config/logger');
const constVer = require('../../config/constant');
const ApiError = require('../../utils/ApiError');
const cornServices = require('../../cornJob/shopifyCorn');
const shopifyRequest = require('../../services/shopify/lib/request');
const LoggerService = require('../../services/logger.service');
const { Product, User } = require('../../models');
const axios = require('axios');
const excelJS = require('exceljs');

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

    // let vendor;
    for (let i = 0; i < allVendors.length; i++) {
      const vendor = allVendors[i];
      console.log('start =========================================================> 1 =  vendor email=', vendor);
      if (vendor.credentials) {
        const tmpClient = new Shopify({
          shopName: vendor.credentials.shopName,
          accessToken: vendor.credentials.accessToken,
          apiVersion: '2022-10',
        });

        let params = { limit: 10 };
        do {
          const products = await tmpClient.product.list(params);
          try {
            // cursor = pagination.nextPageCursor;
            // console.log('products',products, products.length);
            if (products && products.length) {
              let product;
              console.log('2 nextPageParameters==>>', products.nextPageParameters);
              for (let index = 0; index < products.length; index++) {
                product = products[index];
                console.log(' 3 product==>>', product.title, product.id);
                const dbProduct = await Product.findOne({ venderProductPlatformId: product.id });
                // console.log("==dbProduct=",dbProduct)
                // create product
                if (dbProduct && (dbProduct.status === 'PUBLISHED' || dbProduct.status === 'ENABLED')) {
                  try {
                    await cornServices.createUpdateProduct(product, 'update', vendor._id);
                  } catch (error) {
                    console.log("🚀 ~ file: shopifyService.js:57 ~ syncAllShopifyProducts ~ error:", error)
                  }
                } else {
                  try {
                    await cornServices.createUpdateProduct(product, 'create', vendor._id);
                  } catch (error) {
                    console.log("🚀 ~ file: shopifyService.js:64 ~ syncAllShopifyProducts ~ error:", error)
                    
                  }
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

        // (async () => {

        // })().catch(async (err) => {
        //   console.log('===err===', err);
        //   // logger.error(err);
        //   const loggerPayload = {
        //     title: 'Update vendor product',
        //     type: 'publish',
        //     logs: err.message,
        //     level: 'error',
        //   };
        //   await LoggerService.createLogger(loggerPayload);
        //   logger.error('Sync shopify product Error while running cron : ' + err);
        //   // throw new ApiError(402, err.message);
        //   // throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, err.message);
        // });
        // const url = `https://${vendor.credentials.shopName}/admin/api/2022-01/products.json?limit=150`;
        // const response = await shopifyRequest('get', url, vendor.credentials.accessToken).catch((e) => {
        //   // console.log(e);
        // });

        // const products = response && response.data.products;
      }
      console.log('end =========================================================> 1 =  vendor email=', vendor);
    }
  } catch (e) {
    logger.error(e);
    const loggerPayload = {
      title: 'Update vendor product(catch)',
      type: 'publish',
      logs: e.message,
      level: 'error',
    };
    await LoggerService.createLogger(loggerPayload);
    logger.error('Sync shopify product Error while running cron : ' + ((e || {}).config || {}).url);
    logger.error('Sync shopify product Error while running cron : ' + (((e || {}).response || {}).data || {}).message);
  }
};

const getPermissionFile = async () => {
  const permissions = ["write_assigned_fulfillment_orders", "read_assigned_fulfillment_orders", "write_merchant_managed_fulfillment_orders", "read_merchant_managed_fulfillment_orders", "write_orders", "read_orders", "write_products", "read_products", "write_order_edits", "read_order_edits", "write_returns", "read_returns", "read_inventory", "write_inventory"]
  const users = await User.find({ connectionType: "shopify", isDeleted: false }).lean();
  for (let index = 0; index < users.length; index++) {
    const element = users[index];
    const userPermissions = {}
    if(element.credentials) {
      try {
        const response = await axios({
          method: 'get',
          url: `https://${element.credentials.apiKey}:${element.credentials.accessToken}@${element.credentials.shopName}/admin/oauth/access_scopes.json`,
        });
        for (let i = 0; i < permissions.length; i++) {
          const permission = permissions[i];
          const isAvailable = response.data.access_scopes.find((a) => a.handle === permission);
          if(isAvailable) {
            userPermissions[permission] = "Yes"
          } else {
            userPermissions[permission] = "No"
          }
        }
      } catch (error) {
        try {
          const response = await axios({
            method: 'get',
            url: `https://${element.credentials.apiKey}:${element.credentials.accessToken}@${element.credentials.shopName}/admin/oauth/access_scopes.json`,
            headers: {
              Authorization: `Bearer`,
            },
          });
          for (let i = 0; i < permissions.length; i++) {
            const permission = permissions[i];
            const isAvailable = response.data.access_scopes.find((a) => a.handle === permission);
            if(isAvailable) {
              userPermissions[permission] = "Yes"
            } else {
              userPermissions[permission] = "No"
            }
          }
        } catch (error) {
          if(error.response && error.response.data === 401) {
            userPermissions.comments = "Not Allow to check"
          } else {
            userPermissions.comments = (error.response && error.response.data) ? error.response.data.errors : ""
          }          
        }
      }
      await User.findOneAndUpdate({ _id: element._id }, { $set: { permissions: userPermissions}})
    }
  }
}


module.exports = {
  syncAllShopifyProducts,
  getPermissionFile
};
