const axios = require('axios');
const logger = require('../../config/logger');
const User = require('../../models/user.model');
const httpStatus = require('http-status');
const ApiError = require('../../utils/ApiError');
const { Product, VenderOrder, ProductVariants, Order } = require('../../models');
const emailService = require('../emailService');
const constVer = require('../../config/constant');
const cornServices = require('../../cornJob/shopifyCorn');
const vendorService = require('../vendor/vendorService');

const woocommerceProduct = async (userData, id) => {
  return axios({
    method: 'get',
    url: `https://${userData.shopName}/wp-json/wc/v3/products/${id}?consumer_key=${userData.apiKey}&consumer_secret=${userData.apiSecret}`,
    headers: { 'Content-Type': 'application/json' },
  });
};

const woocommerceProductVariant = async (userData, id) => {
  return axios({
    method: 'get',
    url: `https://${userData.shopName}/wp-json/wc/v3/products/${id}/variations?consumer_key=${userData.apiKey}&consumer_secret=${userData.apiSecret}`,
    headers: { 'Content-Type': 'application/json' },
  });
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
  const vendersOrders = await VenderOrder.find({ orderId: vendorOrderData.orderId });
  for (let orderIndex = 0; orderIndex < vendersOrders.length; orderIndex++) {
    const order = vendersOrders[orderIndex];
    allStatusArray.push(order.status);
  }
  const finalStatus = await finalStatusFn(statusPriority, allStatusArray);
  console.log('finalStatus----->>', finalStatus);
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

const finalStatusFn = async (statusArray, currentOrderStatus) => {
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

const convertRemoteProductToPlatformProduct = async (products, userData) => {
  try {
    await products.forEach(async (product) => {
      // for map image data to fit in our db
      let mappedImages = [];
      await product.images.forEach(async (img) => {
        // const s3url = await s3upload.downloadImgAndUploadToS3(img.src);
        const imgObj = {
          bndleImageId: img.id,
          bndleProductId: product.id,
          // src: s3url,
          src: img.src,
        };
        mappedImages.push(imgObj);
      });

      console.log('===mappedImages==>>', mappedImages);
      let mappedOptions = [];
      if (product.attributes.length > 0) {
        mappedOptions = await product.attributes.map((option) => {
          let values = [];
          option.options.map((choice) => {
            values.push(choice);
          });
          const optionObj = {
            name: option.name,
            position: option.position,
            values: values,
          };
          return optionObj;
        });
      }

      const platformProduct = {
        venderProductPlatformId: product.id,
        productSource: constVer.model.product.productSourceEnum[3],
        title: product.name,
        description: product.description,
        vendorId: userData._id,
        vendorName: userData.name,
        status: constVer.model.product.STATUS[5],
        images: mappedImages,
        options: mappedOptions,
        isDeleted: false,
      };
      // create product
      const dbProduct = await Product.findOneAndUpdate(
        { venderProductPlatformId: platformProduct.venderProductPlatformId },
        platformProduct,
        {
          upsert: true,
          new: true,
        }
      );

      await convertRemoteProductVariantToPlatformProductVariant(product, userData, dbProduct);
    });
  } catch (error) {
    throw new ApiError(402, error.message);
  }
};

const wooCommerceProductSync = async (userId) => {
  try {
    const userData = await User.findById(userId);
    vendorService.registerAllWoocommerceWebhooks(userData);
    const limit = 5;
    let offset = 0;
    let page = 1;
    do {
      let product = await axios({
        method: 'get',
        url: `https://${userData.credentials.shopName}/wp-json/wc/v3/products?consumer_key=${userData.credentials.apiKey}&consumer_secret=${userData.credentials.apiSecret}&offset=${offset}&per_page=${limit}`,
        headers: { 'Content-Type': 'application/json' },
      });
      // .then(async (response) => {
      //   // handle success
      //   let products = response.data;
      //   console.log("products===",products.length,products);
      //   if (products.length) {

      //   }
      // })
      // .catch(function (error) {
      //   console.log("error",error)
      //   throw new ApiError(500, 'something went wrong');
      // });

      if (product.data.length > 0) {
        offset += limit;
        page += page;
        // const platform = platformServiceFactory('woocommerce');
        await convertRemoteProductToPlatformProduct(product.data, userData);
      } else {
        page = false;
      }
    } while (page !== false);
    await User.findByIdAndUpdate(userId, { autoProductSynced: true });
  } catch (err) {
    console.log(err);
    throw new ApiError(500, 'something went wrong');
  }
};

const convertRemoteOrderToPlatformOrder = async (order) => {
  try {
    order = order.order;
    // const platform = platformServiceFactory('woocommerce');
    // get product by product id
    let status;
    let currentStatus;
    let products = await VenderOrder.findOne({ venderPlatformOrderId: order.id });
    if (products === null) {
      return true;
    }
    status = products.status;
    currentStatus = products.status;
    products = JSON.parse(JSON.stringify(products));

    // client for get fulfillment status of that user
    // const userData = await User.findById(id);
    // const yolo =
    // console.log(order.id, '----------------');
    // const data = await platform.webhooks.fulfillments(userData, order.id);

    if (order.status === 'on-hold') {
      console.log('inside on hold');
      status = constVer.model.order.vendorOrderStatus.ON_HOLD;
    }
    // console.log(products);
    // console.log(status, '+++++++++++++++++++++++++++');

    if (order.status === 'completed') {
      // console.log('inside +++++++++++++++++++++++');
      status = constVer.model.order.vendorOrderStatus.SHIPPED;
      // products.trackingId = order.fulfillments[0].tracking_number;
      // products.carrier = order.fulfillments[0].tracking_company;
      // products.trackingUrl = order.fulfillments[0].tracking_url;
      products.shippingDate = order.date_modified;
    }

    // if order cenacle
    if (order.status === 'cancelled') {
      // const cancelReason = order.cancel_reason;
      status = constVer.model.order.vendorOrderStatus.REQUEST_DECLINED;
      products.venderPlatformOrderId = order.id;
      // products.cancelReason = cancelReason;
      products.status = status;
      products.cancelAt = order.date_modified;
    }
    products.status = status;

    const statusHistoryObj = {
      status: products.status,
      date: new Date(),
    };
    if (products.status !== currentStatus) {
      products.statusHistory.push(statusHistoryObj);
    }

    const vendorOrderData = await VenderOrder.findOneAndUpdate({ venderPlatformOrderId: order.id }, products, {
      new: true,
    });
    // console.log('++++++++++++++++++++++++');
    // console.log(vendorOrderData);
    if (products.status !== currentStatus) {
      await updateMainOrderStatus(vendorOrderData);
    }

    const vendor = await User.findOne({ _id: vendorOrderData.vendorId }).lean();

    for (let index = 0; index < vendorOrderData.product.length; index++) {
      const orderProduct = vendorOrderData.product[index];

      // eslint-disable-next-line no-shadow, no-await-in-loop
      let product = await woocommerceProduct(vendor.credentials, orderProduct.vendorProductId);
      product = product.data;
      // eslint-disable-next-line no-plusplus
      if (product.variations.length) {
        // eslint-disable-next-line no-await-in-loop
        let productVariant = await woocommerceProductVariant(
          vendor.credentials,
          orderProduct.vendorProductId
        );
        productVariant = productVariant.data;
        // eslint-disable-next-line no-plusplus
        for (let pIndex = 0; pIndex < productVariant.length; pIndex++) {
          const variantEl = productVariant[pIndex];
          // eslint-disable-next-line no-await-in-loop
          await ProductVariants.findOneAndUpdate(
           { venderProductPlatformVariantId: variantEl.id },
            {
              inventoryQuantity: variantEl.stock_quantity && variantEl.stock_quantity,
              openingQuantity: variantEl.stock_quantity && variantEl.stock_quantity,
            },
            {
              upsert: true,
              new: true,
            }
          );
        }
      } else {
        await ProductVariants.findOneAndUpdate(
          { _id: orderProduct.productRef  },
          {
            inventoryQuantity: product.stock_quantity && product.stock_quantity,
            openingQuantity: product.stock_quantity && product.stock_quantity,
          },
          {
            upsert: true,
            new: true,
          }
        );
      }
      try {
        await cornServices.publishProductToShopify(orderProduct.productRef,'PUBLISHED');
      } catch (err) {
        console.log('====errrr===', err);
        // logger.error(err);
        throw new ApiError(httpStatus.BAD_REQUEST, 'something went wrong with push product to shopify');
      }
    }

    if (order.status === 'completed') {
      const orderData = await VenderOrder.findOne({ _id: vendorOrderData._id })
        .populate({
          path: 'vendorId',
        })
        .populate({
          path: 'customerId',
        })
        .lean();
      // orderData
      const email = orderData.customerId.email;
      await emailService.orderShippedEmail(email, orderData, vendorOrderData.trackingId);
    }
    return true;
  } catch (err) {
    console.log(err);
  }
};

const convertRemoteProductVariantToPlatformProductVariant = async (product, userData, dbProduct) => {
  try {
    axios({
      method: 'get',
      url: `https://${userData.credentials.shopName}/wp-json/wc/v3/products/${product.id}/variations?consumer_key=${userData.credentials.apiKey}&consumer_secret=${userData.credentials.apiSecret}`,
      headers: { 'Content-Type': 'application/json' },
    }).then(async (response) => {
      // handle success
      let variants = response.data;
      let platformProductVariant;

      if (variants.length > 0) {
        for (let index = 0; index < variants.length; index++) {
          const variant = variants[index];
          let mappedOptions = [];
          if (variant.attributes.length > 0) {
            for (let index = 0; index < variant.attributes.length; index++) {
              const attribute = variant.attributes[index];
              const optionObj = {
                name: attribute.name,
                value: attribute.option,
              };
              mappedOptions.push(optionObj);
            }
          }

          let mappedVariantImages = [];
          let imageCheck;
          let imgObj;
          if (variant.image) {
            if (product && product.images.length) {
              imgObj = {
                bndleImageId: variant.image.id,
                bndleProductId: product.id,
              };
              imageCheck = product.images.find((currentDbImage) => {
                return currentDbImage.src === variant.image.src;
              });
              if (imageCheck === undefined) {
                // const s3url = await s3upload.downloadImgAndUploadToS3(img.src);
                // imgObj.src = s3url;
                imgObj.src = variant.image.src;
                mappedVariantImages.push(imgObj);
              }
            } else {
              imgObj = {
                bndleImageId: variant.image.id,
                bndleProductId: product.id,
                src: variant.image.src,
              };
              mappedVariantImages.push(imgObj);
            }
          }
          let attribute = [];
          let title;

          for (const { option } of Object.values(variant.attributes)) {
            attribute.push(option);
          }

          attribute.forEach((keyName, index) => {
            const keyValue = keyName;
            if (index === 0) {
              title = keyValue;
            } else {
              title = `${title}/${keyValue}`;
            }
          });

          if (dbProduct.status === 'IMPORTED') {
            console.log('====update with variant===>');
            platformProductVariant = {
              productId: dbProduct._id,
              venderProductPlatformVariantId: variant.id,
              price: variant.price ? variant.price : 0,
              options: mappedOptions,
              sku: variant.sku ? variant.sku : '',
              title: title,
              taxable: dbProduct.tax_status === 'taxable' ? true : false,
              inventoryQuantity: variant.stock_quantity,
              openingQuantity: variant.stock_quantity,
              weight: variant.weight ? variant.weight : 0,
              images: mappedVariantImages,
              isDeleted: false,
              isCompatible: true,
              isEnable: true,
              // variantType: variant.type,
            };
            const findVariants = await ProductVariants.find({
              productId: dbProduct._id,
              venderProductPlatformVariantId: { $exists: true, $eq: '' },
            });
            if (findVariants.length) {
              await ProductVariants.deleteMany({ productId: dbProduct._id });
            }
            await ProductVariants.findOneAndUpdate({ venderProductPlatformVariantId: variant.id }, platformProductVariant, {
              upsert: true,
              new: true,
            });
          } else {
            console.log('===update without variant===');
            platformProductVariant = {
              productId: dbProduct._id,
              venderProductPlatformVariantId: variant.id,
              // price: variant.price ? variant.price : 0,
              // options: mappedOptions,
              // sku: variant.sku ? variant.sku : '',
              // title: dbProduct.title,
              // taxable: dbProduct.tax_status === 'taxable' ? true : false,
              inventoryQuantity: variant.stock_quantity,
              openingQuantity: variant.stock_quantity,
              // weight: product.weight ? product.weight : 0,
              images: mappedVariantImages,
              // isDeleted: false,
              // variantType: product.type,
            };
          }
          await ProductVariants.findOneAndUpdate({ venderProductPlatformVariantId: variant.id }, platformProductVariant, {
            upsert: true,
            new: true,
          });
        }
      } else {
        if (dbProduct.status === 'IMPORTED') {
          console.log('update---->>');
          platformProductVariant = {
            productId: dbProduct._id,
            // venderProductPlatformVariantId: variant.id,
            price: product.price ? product.price : 0,
            options: [],
            sku: product.sku ? product.sku : '',
            title: '',
            taxable: dbProduct.tax_status === 'taxable' ? true : false,
            inventoryQuantity: product.stock_quantity,
            openingQuantity: product.stock_quantity,
            weight: product.weight ? product.weight : 0,
            images: [],
            isDeleted: false,
            isCompatible: true,
            isEnable: true,

            variantType: product.type,
          };
          const findVariants = await ProductVariants.find({ productId: dbProduct._id });
          if (findVariants.length) {
            await ProductVariants.deleteMany({ productId: dbProduct._id });
          }
          await ProductVariants.create(platformProductVariant);
        } else {
          console.log('create----->>>>');
          platformProductVariant = {
            productId: dbProduct._id,
            // venderProductPlatformVariantId: variant.id,
            // price: product.price ? product.price : 0,
            // options: [],
            // sku: product.sku ? product.sku : '',
            // title: product.title,
            // taxable: dbProduct.tax_status === 'taxable' ? true : false,
            inventoryQuantity: product.stock_quantity,
            openingQuantity: product.stock_quantity,
            // weight: product.weight ? product.weight : 0,
            // images: [],
            // isDeleted: false,
            // variantType: product.type,
          };
          const findVariant = await ProductVariants.findOne({ productId: dbProduct._id });
          if (findVariant) {
            await ProductVariants.findOneAndUpdate({ productId: dbProduct._id }, platformProductVariant, {
              upsert: true,
              new: true,
            });
          }
        }
      }
    });
  } catch (error) {
    throw new ApiError(402, error.message);
  }
};

const createUpdateProduct = async (product, userId) => {
  // logger.info(`=====product-woocommerce====, ${JSON.stringify(product)}`);
  const userData = await User.findOne({ _id: userId });
  const currentDbProduct = await Product.findOne({ venderProductPlatformId: product.id });

  // logger.info(`=====currentDbProduct-woocommerce==== ${currentDbProduct}`);
  // logger.info(`=====userData-woocommerce===== ${userData}`);

  if (userData) {
    // for map image data to fit in our db
    const mappedImages = [];
    if (product.images.length > 0) {
      await product.images.forEach((img) => {
        const imgObj = {
          bndleImageId: img.id,
          bndleProductId: product.id,
        };
        let imageCheck;
        if (currentDbProduct && currentDbProduct.images.length) {
          imageCheck = currentDbProduct.images.find((currentDbImage) => {
            return currentDbImage.src === img.src;
          });
          if (imageCheck === undefined) {
            // const s3url = await s3upload.downloadImgAndUploadToS3(img.src);
            // imgObj.src = s3url;
            imgObj.src = img.src;
          } else {
            imgObj.src = imageCheck.src;
          }
        } else {
          // const s3url = await s3upload.downloadImgAndUploadToS3(img.src);
          // imgObj.src = s3url;
          imgObj.src = img.src;
        }
        mappedImages.push(imgObj);
      });
    }

    let mappedOptions = [];
    let optionObj;
    if (product.attributes.length > 0) {
      mappedOptions = await product.attributes.map((option) => {
        if (option.options) {
          let values = [];
          option.options.map((choice) => {
            values.push(choice);
          });
          optionObj = {
            name: option.name,
            position: option.position,
            values: values,
          };
        } else {
          optionObj = {
            name: option.name,
            // position: option.position,
            values: option.option,
          };
        }
        return optionObj;
      });
    }

    const productObj = {
      venderProductPlatformId: product.id,
      productSource: constVer.model.product.productSourceEnum[3],
      title: product.title,
      description: product.description,
      vendorId: userId,
      vendorName: userData.name,
      productType: product.productType,
      status: constVer.model.product.STATUS[5],
      images: mappedImages,
      options: mappedOptions,
      isDeleted: false,
    };

    if (currentDbProduct && currentDbProduct.status !== 'IMPORTED') {
      delete productObj.status;
    }

    // create product
    const dbProduct = await Product.findOneAndUpdate(
      { venderProductPlatformId: productObj.venderProductPlatformId },
      productObj,
      {
        upsert: true,
        new: true,
      }
    );

    // for create variant of product
    if (dbProduct) {
      await convertRemoteProductVariantToPlatformProductVariant(product, userData, dbProduct);
      if (dbProduct && dbProduct.status === 'PUBLISHED') {
        await cornServices.publishProductToShopify(dbProduct._id, 'PUBLISHED');
      }
    } else {
      const loggerPayload = {
        title: 'Product publish',
        type: constVer.model.logger.typeEnum[1],
        logs: productObj,
        level: constVer.model.logger.levelEnum[1],
      };
      await LoggerService.createLogger(loggerPayload);
    }
  }
};

module.exports = {
  wooCommerceProductSync,
  woocommerceProduct,
  woocommerceProductVariant,
  createUpdateProduct,
  convertRemoteOrderToPlatformOrder,
};
