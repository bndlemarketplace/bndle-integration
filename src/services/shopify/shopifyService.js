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
const algoliasearch = require('algoliasearch');
const algoliaClient = algoliasearch(process.env.ALGOLIA_APPLICATION_ID, process.env.ALGOLIA_KEY);
const index = algoliaClient.initIndex('Product');

const getAllProducts = async (params, vendor, allProducts = []) => {
  try {
    const tmpClient = new Shopify({
      shopName: vendor.credentials.shopName,
      accessToken: vendor.credentials.accessToken,
      apiVersion: '2022-10',
    });
    const products = await tmpClient.product.list(params);

    console.log("🚀 ~ file: shopifyService.js:26 ~ getAllProducts ~ products.length:", products.length)
    if (products && products.length) {
      allProducts = [...allProducts, ...products];
    }

    if (products.nextPageParameters) {
      params = products.nextPageParameters;
      return await getAllProducts(params, vendor, allProducts);
    } else {
      return allProducts;
    }
  } catch (error) {
    console.log('🚀 ~ file: shopifyService.js:34 ~ getAllProducts ~ error:', error);
    return allProducts;
  }
};

const syncAllShopifyProducts = async (vendorId = '', productId = '') => {
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

    console.log('🚀 ~ file: shopifyService.js:52 ~ syncAllShopifyProducts ~ allVendors:', allVendors.length);
    for (let i = 0; i < allVendors.length; i++) {
      let vendor = allVendors[i];
      console.log('🚀 ~ file: shopifyService.js:53 ~ syncAllShopifyProducts ~ i:', i, vendor._id);
      if (vendor.credentials) {
        const products = await getAllProducts({ limit: 100 }, vendor);
        console.log('🚀 ~ file: shopifyService.js:61 ~ syncAllShopifyProducts ~ products:', products.length);
        if (products && products.length) {
          let promises = []
          for (let index = 0; index < products.length; index++) {
            let product = products[index];
            promises.push(cornServices.createUpdateProduct(product, 'update', vendor._id, true));
            // try {
            //   // const dbProduct = await Product.findOne({ venderProductPlatformId: product.id });
            //   // console.log("==dbProduct=",dbProduct)
            //   // create product
            //   if (dbProduct && (dbProduct.status === 'PUBLISHED' || dbProduct.status === 'ENABLED')) {
            //     promises.push(cornServices.createUpdateProduct(product, 'update', vendor._id, true));
            //   } else {
            //     // await cornServices.createUpdateProduct(product, 'create', vendor._id);
            //   }
            // } catch (productError) {
            //   console.log('🚀 ~ file: shopifyService.js:60 ~ productError:', productError);
            // }
          }

          await Promise.allSettled(promises);
        }
      }
    }
  } catch (error) {}
};

// 63e9dd5b4229fe58b04f117c
const syncAllShopifyProductsOld = async (vendorId = '', productId = '') => {
  console.log('🚀 ~ file: shopifyService.js:18 ~ syncAllShopifyProducts ~ vendorId:', vendorId);
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
    console.log('🚀 ~ file: shopifyService.js:33 ~ syncAllShopifyProducts ~ allVendors.length:', allVendors.length);
    for (let i = 0; i < allVendors.length; i++) {
      vendor = allVendors[i];
      console.log('start =========================================================> 1 =  vendor email=', i);
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
                  try {
                    const dbProduct = await Product.findOne({ venderProductPlatformId: product.id });
                    // console.log("==dbProduct=",dbProduct)
                    // create product
                    if (dbProduct && (dbProduct.status === 'PUBLISHED' || dbProduct.status === 'ENABLED')) {
                      await cornServices.createUpdateProduct(product, 'update', vendor._id);
                    } else {
                      // await cornServices.createUpdateProduct(product, 'create', vendor._id);
                    }
                  } catch (productError) {
                    console.log('🚀 ~ file: shopifyService.js:60 ~ productError:', productError);
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
  const permissions = [
    'write_assigned_fulfillment_orders',
    'read_assigned_fulfillment_orders',
    'write_merchant_managed_fulfillment_orders',
    'read_merchant_managed_fulfillment_orders',
    'write_orders',
    'read_orders',
    'write_products',
    'read_products',
    'write_order_edits',
    'read_order_edits',
    'write_returns',
    'read_returns',
    'read_inventory',
    'write_inventory',
  ];
  const users = await User.find({ connectionType: 'shopify', isDeleted: false }).lean();
  for (let index = 0; index < users.length; index++) {
    const element = users[index];
    const userPermissions = {};
    if (element.credentials) {
      try {
        const response = await axios({
          method: 'get',
          url: `https://${element.credentials.apiKey}:${element.credentials.accessToken}@${element.credentials.shopName}/admin/oauth/access_scopes.json`,
        });
        for (let i = 0; i < permissions.length; i++) {
          const permission = permissions[i];
          const isAvailable = response.data.access_scopes.find((a) => a.handle === permission);
          if (isAvailable) {
            userPermissions[permission] = 'Yes';
          } else {
            userPermissions[permission] = 'No';
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
            if (isAvailable) {
              userPermissions[permission] = 'Yes';
            } else {
              userPermissions[permission] = 'No';
            }
          }
        } catch (error) {
          if (error.response && error.response.data === 401) {
            userPermissions.comments = 'Not Allow to check';
          } else {
            userPermissions.comments = error.response && error.response.data ? error.response.data.errors : '';
          }
        }
      }
      await User.findOneAndUpdate({ _id: element._id }, { $set: { permissions: userPermissions } });
    }
  }
};

const syncAlgoliaProduct = async () => {
  let hits = [];
  // Get all records as an iterator
  await index.browseObjects({
    batch: (batch) => {
      hits = hits.concat(batch);
    },
  });

  console.log("🚀 ~ file: shopifyService.js:262 ~ syncAlgoliaProduct ~ hits:", hits.length)
  for (let index = 0; index < hits.length; index++) {
    const element = hits[index];
    console.log("🚀 ~ file: shopifyService.js:264 ~ syncAlgoliaProduct ~ element:", element.name)
    const product = await Product.findOne({ bndleId: element.objectID, status: 'PUBLISHED' });
    if (!product) {
      console.log("🚀 ~ file: shopifyService.js:266 ~ syncAlgoliaProduct ~ product:", product)
      await index.deleteObject(element.objectID);
    }
  }
};

module.exports = {
  syncAllShopifyProducts,
  getPermissionFile,
  syncAlgoliaProduct,
};
