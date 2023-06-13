const httpStatus = require('http-status');
const axios = require('axios');
const ApiError = require('../../utils/ApiError');
const { AUTH_PROVIDER_BASE_URL, WIX_API_URL } = process.env;
const logger = require('../../config/logger');
const constVer = require('../../config/constant');
const User = require('../../models/user.model');
const { Product, ProductVariants, VenderOrder, Order } = require('../../models');
// const  {s3Url} = require('../../config/restifyConfig');
const s3upload = require('../../utils/s3-bucket');
const emailService = require('../emailService');
const VendorOrder = require('../../models/vendorOrder.model');
const cornServices = require('../../cornJob/shopifyCorn');
const LoggerService = require('../../services/logger.service');

const wixProductSync = async (userId) => {
  try {
    const userData = await User.findById(userId);
    if (userData.autoProductSynced === true) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'already product synced');
    }

    if (userData) {
      let apiKey = userData.credentials?.apiKey;
      let apiSecret = userData.credentials?.apiSecret;
      let refreshToken = userData.credentials?.refreshToken;
      let accessToken;

      const limit = 5;
      let offset = 0;
      let totalResults = 0;
      do {
        const data = await getWixToken(apiKey, apiSecret, refreshToken);
        accessToken = data.access_token;

        const productData = await getWixProducts(accessToken, limit, offset);
        // console.log(productData);
        totalResults = productData.totalResults;
        offset += limit;
        if (productData.products.length > 0) {
          for (let index = 0; index < productData.products.length; index++) {
            const product = productData.products[index];

            // for map image data to fit in our db
            const mappedImages = [];
            if (product.media.items.length > 0) {
              for (let index = 0; index < product.media.items.length; index++) {
                const img = product.media.items[index];
                // const s3url = await s3upload.downloadImgAndUploadToS3(img.image ? img.image.url : '');
                if (img.image) {
                  const imgObj = {
                    // bndleImageId: img.id,// not available in wix
                    bndleProductId: product.id,
                    // position: img.position,//not available in wix
                    src: img.image ? img.image.url : '',
                  };
                  mappedImages.push(imgObj);
                }
              }
            }

            let mappedOptions = [];
            if (product.productOptions.length > 0) {
              mappedOptions = await product.productOptions.map((option) => {
                let values = [];
                option.choices.map((choice) => {
                  option.optionType === 'color' ? values.push(choice.description) : values.push(choice.value);
                });
                const optionObj = {
                  // venderProductPlatformOptionId: option.id, // not available in wix
                  name: option.name,
                  // position: option.position, // not available in wix
                  values: values,
                };
                return optionObj;
              });
            }

            const productObj = {
              venderProductPlatformId: product.id,
              productSource: constVer.model.product.productSourceEnum[2],
              title: product.name,
              description: product.description,
              vendorId: userId,
              vendorName: userData.name,
              productType: product.productType,
              status: constVer.model.product.STATUS[5],
              // tags: product.tags, //nothing like that wix
              images: mappedImages,
              options: mappedOptions,
              isDeleted: false,
            };
            // create product
            const dbProduct = await Product.findOneAndUpdate(
              { venderProductPlatformId: productObj.venderProductPlatformId },
              productObj,
              {
                upsert: true,
                new: true,
              }
            );

            // logger.info(`dbProduct ${dbProduct}`);
            if (dbProduct) {
              // for create variant of product
              await productVariantSync(product, accessToken, dbProduct, 'create');
            } else {
              const loggerPayload = {
                title: 'Product sync',
                type: constVer.model.logger.typeEnum[0],
                logs: productObj,
                level: constVer.model.logger.levelEnum[0],
              };
              await LoggerService.createLogger(loggerPayload);
            }
          }
        }
      } while (offset < totalResults);
      // await User.findByIdAndUpdate(userId, { autoProductSynced: true });
      return true;
    }
  } catch (error) {
    logger.info(`wixProductSync-error ${error}`);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, error.message);
  }
};

const getWixProducts = async (access_token, limit, offset) => {
  // console.log(`${access_token}////////////////////////`);
  return await axios({
    method: 'post',
    url: `${WIX_API_URL}/query`,
    headers: { 'Content-Type': 'application/json', Authorization: access_token },
    data: {
      query: {
        paging: {
          limit: limit,
          offset: offset,
        },
      },
      includeVariants: true,
      // includeHiddenProducts: true,
      includeMerchantSpecificData: true,
    },
  })
    .then(async (response) => {
      return response.data;
    })
    .catch((error) => {
      // handle error
      console.log(error);
      logger.error(`getWixProducts-error ${error}`);
      throw new ApiError(httpStatus.NOT_FOUND, error.message);
    });
};

const getVariants = async (productId, access_token) => {
  return await axios({
    method: 'post',
    url: `${WIX_API_URL}/${productId}/variants/query`,
    headers: { 'Content-Type': 'application/json', Authorization: access_token },
  })
    .then(async (response) => {
      return response.data;
    })
    .catch((error) => {
      // handle error
      logger.error(`getVariants-error- ${error}`);
      throw new ApiError(httpStatus.NOT_FOUND, error.message);
    });
};

const getWixToken = (apiKey, apiSecret, refreshToken) => {
  return axios
    .post(`${AUTH_PROVIDER_BASE_URL}/access`, {
      refresh_token: refreshToken,
      client_secret: apiSecret,
      client_id: apiKey,
      grant_type: 'refresh_token',
    })
    .then((resp) => resp.data);
};

const wixProduct = async (accessToken, id) => {
  return axios({
    method: 'get',
    url: `https://www.wixapis.com/stores/v1/products/${id}`,
    headers: { 'Content-Type': 'application/json', Authorization: accessToken },
  });
};

const getWixProductById = async (access_token, id) => {
  return await axios({
    method: 'get',
    url: `${WIX_API_URL}/${id}`,
    headers: { 'Content-Type': 'application/json', Authorization: access_token },
    data: {
      includeVariants: true,
      // includeHiddenProducts: true,
      includeMerchantSpecificData: true,
    },
  })
    .then(async (response) => {
      return response.data;
    })
    .catch((error) => {
      // handle error
      logger.error(`getWixProductsById-error ${error}`);
      throw new ApiError(httpStatus.NOT_FOUND, error.message);
    });
};

const createUpdateProduct = async (productId, mode, userId) => {
  try {
    let dbProduct;
    const userData = await User.findOne({ _id: userId });
    const currentDbProduct = await Product.findOne({ venderProductPlatformId: productId });

    // logger.info(`=====currentDbProduct==== ${currentDbProduct}`);
    // `=====userData===== ${userData}`;

    if (userData) {
      let apiKey = userData.credentials?.apiKey;
      let apiSecret = userData.credentials?.apiSecret;
      let refreshToken = userData.credentials?.refreshToken;
      const data = await getWixToken(apiKey, apiSecret, refreshToken);

      let accessToken = data.access_token;
      let product = await getWixProductById(accessToken, productId);
      product = product.product;
      // console.log(product)
      // for map image data to fit in our db
      
        let mappedImages = [];
        if(product.media && product.media.mainMedia && product.media.mainMedia.image && product.media.mainMedia.image.url) {
          let oldImg = currentDbProduct.images.findIndex((i) => i.src === product.media.mainMedia.image.url);
          if(oldImg === -1) {
            const imgObj = {
              bndleProductId: product.id,
              productPlatformSrc: product.media.mainMedia.image.url,
              src: product.media.mainMedia.image.url,
            };
            mappedImages.push(imgObj);
          }
        }

        if (product.media.items.length > 0) {
          for (let index = 0; index < product.media.items.length; index++) {
            const img = product.media.items[index];
            if (img.image) {
              let oldImg = currentDbProduct.images.findIndex((i) => i.src === img.image.url);
              let mppedImg = mappedImages.findIndex((i) => i.src === img.image.url);
              if(mppedImg === -1) {
                const imgObj = {
                  bndleProductId: product.id,
                  productPlatformSrc: img.image.url,
                  src: img.image.url,
                  position: (oldImg > -1) ? currentDbProduct.images[oldImg].position : product.media.items.length + 1,
                };
                mappedImages.push(imgObj);
              }
            }
          }
        }

        // if (product.media.items.length > 0) {
        //   for (let index = 0; index < product.media.items.length; index++) {
        //     const img = product.media.items[index];
        //     if (img.image) {
        //       const imgObj = {
        //         bndleProductId: product.id,
        //         productPlatformSrc: img.image ? img.image.url : '',
        //       };

        //       let imageCheck;
        //       if (currentDbProduct) {
        //         imageCheck = currentDbProduct.images.find(async (currentDbImage) =>
        //           currentDbImage.ProductPlatformSrc === img.image ? img.image.url : ''
        //         );
        //         if (imageCheck === undefined) {
        //           // const s3url = await s3upload.downloadImgAndUploadToS3(img.image ? img.image.url : '');
        //           imgObj.src = img.image ? img.image.url : '';
        //         } else {
        //           imgObj.src = imageCheck.src;
        //         }
        //       } else {
        //         // const s3url = await s3upload.downloadImgAndUploadToS3(img.image ? img.image.url : '');
        //         imgObj.src = img.image ? img.image.url : '';
        //       }
        //       mappedImages.push(imgObj);
        //     }
        //   }
        // }


        // for (let index = 0; index < currentDbProduct.images.length; index++) {
        //   const element = currentDbProduct.images[index];
        //   let oldImg = product.media.items.findIndex((i) => i.image && i.image.url === element.src);
        //   if(oldImg === -1) {
        //     currentDbProduct.images.splice(index, 1)
        //   }
        // }

        let mappedOptions = [];
        if (product.productOptions.length > 0) {
          mappedOptions = await product.productOptions.map((option) => {
            let values = [];
            option.choices.map((choice) => {
              option.optionType === 'color' ? values.push(choice.description) : values.push(choice.value);
            });
            const optionObj = {
              name: option.name,
              values: values,
            };
            return optionObj;
          });
        }
        const productObj = {
          venderProductPlatformId: product.id,
          productSource: constVer.model.product.productSourceEnum[2],
          title: product.name,
          description: product.description,
          vendorId: userId,
          vendorName: userData.name,
          productType: product.productType,
          status: 'IMPORTED',
          images: mappedImages,
          options: mappedOptions,
          isDeleted: false,
        };
        if (mode === 'update') {
          delete productObj.status;
          delete productObj.description;
          delete productObj.productSource;
          delete productObj.vendorId;
          delete productObj.vendorName;
          delete productObj.productType;
          delete productObj.isDeleted;
        }
        console.log("🚀 ~ file: wixService.js:300 ~ createUpdateProduct ~ productObj:", productObj)
        // create product
        dbProduct = await Product.findOneAndUpdate(
          { venderProductPlatformId: productObj.venderProductPlatformId },
          productObj,
          {
            upsert: true,
            new: true,
          }
        );
      
      // for create variant of product
      if (dbProduct) {
        // console.log(dbProduct._id);
        await productVariantSync(product, accessToken, dbProduct, mode);
        console.log("🚀 ~ file: wixService.js:369 ~ createUpdateProduct ~ mappedImages:", mappedImages)
        const productVariantUpdates = await ProductVariants.find({ productId: dbProduct._id}).lean();
        console.log("🚀 ~ file: wixService.js:357 ~ createUpdateProduct ~ productVariantUpdates:", productVariantUpdates)
        for (let index = 0; index < productVariantUpdates.length; index++) {
          const element = productVariantUpdates[index];
          for (let i = 0; i < element.images.length; i++) {
            const image = element.images[i];
            const isImageAvailable = mappedImages.findIndex((m) => m.src === image.src)
            if(isImageAvailable > -1) {
              mappedImages.splice(isImageAvailable, 1)
            }
          }
        }
        mappedImages = mappedImages.sort((a,b) => (a.position > b.position) ? 1 : ((b.position > a.position) ? -1 : 0))

        console.log("🚀 ~ file: wixService.js:369 ~ createUpdateProduct ~ mappedImages:", mappedImages)
        await Product.findOneAndUpdate({ _id: dbProduct._id}, { $set: { images: mappedImages}})
      } else {
        const loggerPayload = {
          title: 'Product publish',
          type: constVer.model.logger.typeEnum[1],
          logs: productObj,
          level: constVer.model.logger.levelEnum[1],
        };
        await LoggerService.createLogger(loggerPayload);
      }
      if (dbProduct && dbProduct.status === 'PUBLISHED') {
        await cornServices.publishProductToShopify(dbProduct._id, 'PUBLISHED');
      }
    }
  } catch (err) {
    console.log(err);
  }
};

const finalStatusFn = (statusArray, currentOrderStatus) => {
  let isAllStatusSame = true;
  let highestPriorityStatus = '';
  for (let currentOrderStatusIndex = 0; currentOrderStatusIndex < currentOrderStatus.length; currentOrderStatusIndex++) {
    const currentStatus = currentOrderStatus[currentOrderStatusIndex];
    if (currentStatus !== currentOrderStatus[0]) {
      isAllStatusSame = false;
      break;
    }
  }

  if (isAllStatusSame) {
    return currentOrderStatus[0];
  }

  if (!isAllStatusSame) {
    for (
      let highestPriorityStatusIndex = 0;
      highestPriorityStatusIndex < currentOrderStatus.length;
      highestPriorityStatusIndex++
    ) {
      const status = currentOrderStatus[highestPriorityStatusIndex];

      if (statusArray.indexOf(highestPriorityStatus) < statusArray.indexOf(status)) {
        highestPriorityStatus = status;
      }
    }
    if (highestPriorityStatus === 'SHIPPED') {
      highestPriorityStatus = 'PARTIALLY_SHIPPED';
    } else if (highestPriorityStatus === 'REQUEST_DECLINED') {
      highestPriorityStatus = 'PARTIALLY_REQUEST_DECLINED';
    } else if (highestPriorityStatus === 'ON_HOLD') {
      highestPriorityStatus = 'PARTIALLY_ON_HOLD';
    }

    return highestPriorityStatus;
  }
};

const updateOrderStatus = async (order) => {
  console.log('order====>>>', order);
  try {
    // get product by product id
    let status;
    let currentStatus;
    const products = await VenderOrder.findOne({ venderPlatformOrderId: order.orderId });
    // console.log(products);
    status = products && products.status;
    currentStatus = products.status;
    if (order.fulfillmentStatus === 'FULFILLED') {
      status = constVer.model.order.vendorOrderStatus.SHIPPED;
    }
    if (order.fulfillmentStatus === 'PARTIALLY_FULFILLED') {
      status = constVer.model.order.vendorOrderStatus.PARTIALLY_SHIPPED;
    }
    // if (order.cancelled_at && order.cancelled_at !== null) {
    //   const cancelReason = order.cancel_reason;
    //   status = constVer.model.order.vendorOrderStatus.REQUEST_DECLINED;
    //   await VenderOrder.findOneAndUpdate(
    //     { venderPlatformOrderId: order.orderId },
    //     { cancelReason, status, cancelAt: order.cancelled_at }
    //   );
    // }
    products.status = status;
    const statusHistoryObj = {
      status: products.status,
      date: new Date(),
    };
    if (products.status !== currentStatus) {
      products.statusHistory.push(statusHistoryObj);
    }
    products.trackingId = order.trackingInfo.trackingNumber;
    products.trackingUrl = order.trackingInfo.trackingLink;
    products.carrier = order.trackingInfo.shippingProvider;
    products.status = status;
    console.log('status', status);
    const vendorOrderData = await VenderOrder.findOneAndUpdate({ venderPlatformOrderId: order.orderId }, products, {
      upsert: true,
      new: true,
    });
    console.log('++++++++++++++++++++++++');
    console.log(vendorOrderData);
    if (products.status !== currentStatus) {
      await updateMainOrderStatus(vendorOrderData);
    }
    const orderData = await VenderOrder.findOne({ _id: vendorOrderData._id })
      .populate({
        path: 'vendorId',
      })
      .populate({
        path: 'customerId',
      })
      .lean();
    const email = orderData.customerId.email;
    await emailService.orderShippedEmail(email, orderData, vendorOrderData.trackingId, vendorOrderData.trackingUrl);
    return true;
  } catch (err) {
    console.log(err);
  }
};

const cancelOrderStatus = async (order, eventType) => {
  console.log("🚀 ~ file: wixService.js:492 ~ cancelOrderStatus ~ eventType:", eventType)
  console.log('order.fulfillmentStatus ', order.fulfillmentStatus);
  try {
    // get product by product id
    let status;
    let currentStatus;
    const products = await VenderOrder.findOne({ venderPlatformOrderId: order.id });
    // console.log(products);
    status = products.status;
    currentStatus = products.status;
    if (eventType === 'OrderCanceled') {
      status = constVer.model.order.vendorOrderStatus.REQUEST_DECLINED;
      products.status = status;
      await VenderOrder.findOneAndUpdate(
        { venderPlatformOrderId: order.id },
        { status, cancelAt: order.lastUpdated }
      );
    }
    // if (order.cancelled_at && order.cancelled_at !== null) {
    //   const cancelReason = order.cancel_reason;
    //   status = constVer.model.order.vendorOrderStatus.REQUEST_DECLINED;
    
    //   }
    const statusHistoryObj = {
      status: products.status,
      date: new Date(),
    };
    if (products.status !== currentStatus) {
      products.statusHistory.push(statusHistoryObj);
    }
    // console.log('status', status);
      const vendorOrderData = await VenderOrder.findOneAndUpdate({ venderPlatformOrderId: order.id }, products, {
        // upsert: true,
        new: true,
      });
    const user = await User.findOne({ _id: vendorOrderData.vendorId }).lean();
    const { apiKey, apiSecret, refreshToken } = user.credentials;
    const wixToken = await getWixToken(apiKey, apiSecret, refreshToken);
    const accessToken = wixToken.access_token;

    for (let index = 0; index < vendorOrderData.product.length; index++) {
      const orderProduct = vendorOrderData.product[index];

      // eslint-disable-next-line no-shadow, no-await-in-loop
      const { data } = await wixProduct(accessToken, orderProduct.vendorProductId);
      const productVariantData = data.product;
      // eslint-disable-next-line no-plusplus
      for (let pIndex = 0; pIndex < productVariantData.variants.length; pIndex++) {
        const variantEl = productVariantData.variants[pIndex];
        // eslint-disable-next-line no-await-in-loop
        const updatedVariant = await ProductVariants.findOneAndUpdate(
          { _id: orderProduct.variantRef },
          {
            inventoryQuantity: variantEl.stock && variantEl.stock.quantity,
            openingQuantity: variantEl.stock && variantEl.stock.quantity,
          },
          {
            upsert: true,
            new: true,
          }
        );
        if (updatedVariant) {
          try {
            const checkStatus = await Product.findOne({ _id: orderProduct.productRef }).lean();
            if (checkStatus.status === 'PUBLISHED') {
              await cornServices.publishProductToShopify(orderProduct.productRef, 'PUBLISHED');
            }
          } catch (err) {
            // logger.error(err);
            throw new ApiError(httpStatus.BAD_REQUEST, 'something went wrong with push product to shopify');
          }
        }
      }
    }
    // console.log(vendorOrderData);
    await updateMainOrderStatus(vendorOrderData);
    return true;
  } catch (err) {
    console.log(err);
  }
};

const syncAllProducts = async () => {
  const users = await User.find({
    connectionType: 'wix',
    isDeleted : false
  }).lean();

  for (let index = 0; index < users.length; index++) {
    const user = users[index];
    const dbProducts = await Product.find({
      vendorId: user._id,
    }).lean();
    if (user.connectionType === 'wix') {
      for (let index = 0; index < dbProducts.length; index++) {
        try {
          const dbProduct = dbProducts[index];
          // console.log("==dbProduct===wix",dbProduct)
          await createUpdateProduct(dbProduct.venderProductPlatformId, 'update', user._id);
        } catch (error) {
          console.log("🚀 ~ file: wixService.js:529 ~ syncAllProducts ~ error:", error)
        }
      }
    }
  }
}


module.exports = {
  wixProductSync,
  createUpdateProduct,
  updateOrderStatus,
  cancelOrderStatus,
  syncAllProducts
};

const updateMainOrderStatus = async (vendorOrderData) => {
  const statusPriority = [
    'NEW',
    'PARTIALLY_ON_HOLD',
    'ON_HOLD',
    'PARTIALLY_REQUEST_DECLINED',
    'REQUEST_DECLINED',
    'PARTIALLY_SHIPPED',
    'SHIPPED',
    'PARTIALLY_RETURNED',
    'RETURNED',
    'PARTIALLY_REFUNDED',
    'REFUNDED',
    'PARTIALLY_RETURN_IN_PROGRESS',
    'RETURN_IN_PROGRESS',
  ];

  const mainOrder = await Order.findOne({ _id: vendorOrderData.orderId });
  // const currentOrderStatus = vendorOrderData.status;
  // let mainOrderStatus = mainOrder.status;
  const allStatusArray = [];
  const vendersOrders = await VendorOrder.find({ orderId: vendorOrderData.orderId });
  for (let orderIndex = 0; orderIndex < vendersOrders.length; orderIndex++) {
    const order = vendersOrders[orderIndex];
    allStatusArray.push(order.status);
  }
  const finalStatus = finalStatusFn(statusPriority, allStatusArray);

  const orderObj = JSON.parse(JSON.stringify(mainOrder));
  orderObj.status = finalStatus;

  const vendorIndex = await mainOrder.vendor.findIndex((vendor) => {
    return vendorOrderData.vendorId.equals(vendor.vendorId);
  });

  if (vendorOrderData.status === 'REQUEST_DECLINED') {
    orderObj.isCancel = true;
  }

  console.log(vendorIndex);
  orderObj.vendor[vendorIndex] = vendorOrderData;

  const statusHistoryObj = {
    status: orderObj.status,
    date: new Date(),
  };
  orderObj.statusHistory.push(statusHistoryObj);
  // body.statusHistory = currentOrder.statusHistory;
  console.log('++++++++++++++++++++++++++++', orderObj);
  await Order.updateOne({ _id: vendorOrderData.orderId }, orderObj);
};


async function productVariantSync(product, accessToken, dbProduct, mode) {
  try {
    // console.log(product);
    let variant = product.variants;
    // console.log("🚀 ~ file: wixService.js:607 ~ productVariantSync ~ variant:", variant)
    let variantObj;

    // console.log(variant);
    let productOptions = product.productOptions;
    let many = [];
    for (let index = 0; index < variant.length; index++) {
      // console.log(index, '++++++++++++++++++++++++000000000000000000000000000++++++++++++++++++++++');
      const variantEl = variant[index];

      const variantImg = [];
      const keys = Object.keys(variantEl.choices);
      // console.log(variantEl.choices);
      console.log(keys);
      if (keys.length > 0) {
        for (let index = 0; index < keys.length; index++) {
          const keysEl = keys[index];
          console.log("🚀 ~ file: wixService.js:624 ~ productVariantSync ~ keysEl:", keysEl)
          for (let index = 0; index < productOptions.length; index++) {
            const optionEl = productOptions[index];
            console.log("🚀 ~ file: wixService.js:627 ~ productVariantSync ~ optionEl:", optionEl)
            let isColor = false;
            if (optionEl.name === 'Color') {
              isColor = true;
            }
            if (optionEl.name == keysEl) {
              for (let index = 0; index < optionEl.choices.length; index++) {
                const choices = optionEl.choices[index];
                // console.log(choices)
                if (
                  choices.value == variantEl.choices[keysEl] || (isColor && choices.description === variantEl.choices[keysEl] && productOptions.length)
                ) {
                  if (choices.media?.items.length > 0) {
                    for (let index = 0; index < choices.media.items.length; index++) {
                      const img = choices.media.items[index];
                      if (img.image) {
                        const imgObj = {
                          bndleProductId: product.id,
                          src: img.image ? img.image.url : '',
                        };
                        variantImg.push(imgObj);
                        // s3upload.downloadImgAndUploadToS3(img.image ? img.image.url : '').then(s3url=>{
                        // });
                      }
                    }
                  }

                  let mappedOption = [];
                  for (const [key, value] of Object.entries(variantEl.choices)) {
                    mappedOption.push({
                      name: key,
                      value: value,
                    });
                  }
                  // let title;
                  let title = '';
                  keys.forEach((keyName, index) => {
                    const keyValue = variantEl.choices[keyName];
                    console.log("🚀 ~ file: wixService.js:665 ~ keys.forEach ~ keyValue:", keyValue)
                    if (index === 0) {
                      title = keyValue;
                    } else {
                      title = `${title}/${keyValue}`;
                    }
                  });
                  // if (variantEl.choices.Color && variantEl.choices.Size) {
                  //   title = `${variantEl.choices.Color}/${variantEl.choices.Size}`;
                  // } else {
                  //   title = variantEl.choices.Color
                  //     ? variantEl.choices.Color
                  //     : variantEl.choices.Size
                  //     ? variant.choices.Size
                  //     : '';
                  // }
                  if (mode === 'update') {
                    variantObj = {
                      productId: dbProduct._id,
                      venderProductPlatformVariantId: variantEl.id,
                      price: variantEl.variant.priceData.price,
                      // options: mappedOption,
                      // sku: variantEl.variant.sku,
                      title: title,
                      // taxable: true,
                      // weight: variantEl.variant.weight,
                      inventoryQuantity: variantEl.stock && variantEl.stock.quantity,
                      openingQuantity: variantEl.stock && variantEl.stock.quantity,
                      images: variantImg,
                      // isDeleted: false,
                    };
                  } else {
                    variantObj = {
                      productId: dbProduct._id,
                      venderProductPlatformVariantId: variantEl.id,
                      price: variantEl.variant.priceData.price,
                      options: mappedOption,
                      sku: variantEl.variant.sku,
                      title: title,
                      taxable: true,
                      weight: variantEl.variant.weight,
                      inventoryQuantity: variantEl.stock && variantEl.stock.quantity,
                      openingQuantity: variantEl.stock && variantEl.stock.quantity,
                      images: variantImg,
                      isDeleted: false,
                    };
                  }
                  // console.log(variantObj, 'varian obj ++++++++++++++++++++++++++++++');
                  // many.push(variantObj);
                }
              }
            }
          }
        }
        console.log("🚀 ~ file: wixService.js:717 ~ productVariantSync ~ variantObj:", variantObj)
        await ProductVariants.findOneAndUpdate({ venderProductPlatformVariantId: variantEl.id }, variantObj, {
          upsert: true,
          new: true,
        });
      } else {
        // console.log('inside default variant');
        if (mode === 'update') {
          variantObj = {
            productId: dbProduct._id,
            venderProductPlatformVariantId: variantEl.id,
            price: variantEl.variant.priceData.price,
            // options: mappedOption,
            // sku: variantEl.variant.sku,
            // title: title,
            // taxable: true,
            // weight: variantEl.variant.weight,
            inventoryQuantity: variantEl.stock && variantEl.stock.quantity,
            openingQuantity: variantEl.stock && variantEl.stock.quantity,
            // images: variantImg,
            // isDeleted: false,
          };
        } else {
          variantObj = {
            productId: dbProduct._id,
            venderProductPlatformVariantId: '00000000-0000-0000-0000-000000000000',
            price: variantEl.variant.priceData.price,
            options: [],
            sku: variantEl.variant.sku,
            title: '',
            taxable: true,
            weight: variantEl.variant.weight,
            inventoryQuantity: variantEl.stock && variantEl.stock.quantity,
            openingQuantity: variantEl.stock && variantEl.stock.quantity,
            images: variantImg,
            isDeleted: false,
            isCompatible: true,
            isEnable: true,
          };
        }
        // console.log(variantObj);
        // many.push(variantObj);
        const findVariant = await ProductVariants.findOne({ productId: dbProduct._id });
        if (findVariant) {
          await ProductVariants.findOneAndUpdate({ productId: dbProduct._id }, variantObj, {
            upsert: true,
            new: true,
          });
        } else {
          await ProductVariants.create(variantObj);
        }
      }
    }

    // let deleted = await ProductVariants.deleteMany({ productId: dbProduct._id });

    // if (deleted) {
    //   for (let index = 0; index < many.length; index++) {
    //     const images = many[index];
    //     if (images.images.length > 0) {
    //       for (let index = 0; index < images.images.length; index++) {
    //         await ProductVariants.create(images);
    //         // images.images.forEach((image) => {
    //         // s3upload.downloadImgAndUploadToS3(image.src).then(async (s3url) => {
    //         //   image.src = s3url;
    //         //   await ProductVariants.create(images);
    //         // });
    //         // });
    //       }
    //     } else {
    //       await ProductVariants.create(images);
    //     }
    //   }
    // }

    // await ProductVariants.create(images);
  } catch (error) {
    console.log(error);
    logger.error(`productVariantSync-error ${error}`);
  }
}
