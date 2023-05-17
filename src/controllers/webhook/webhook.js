const jwt = require('jsonwebtoken');
const axios = require('axios');
const cornServices = require('../../cornJob/shopifyCorn');
const catchAsync = require('../../utils/catchAsync');
const ApiError = require('../../utils/ApiError');
const wixService = require('../../services/wix/wixService');
const squarespaceService = require('../../services/squarespace/squarespaceService');
const logger = require('../../config/logger');
const User = require('../../models/user.model');
const woocommerceService = require('../../services/woocommerce/wooCommerceService');
const productService = require('../../services/product.service');
// module.exports = {

const createProductWebhook = catchAsync(async (req, res) => {
  console.log('==================createProduct===================');
  res.status(200).jsend.success({ message: 'product created successfully' });
  try {
    const body = req.body;
    const { id } = req.params;
    await cornServices.createUpdateProduct(body, 'create', id);
    // return res.status(200).jsend.success({ message: 'product created successfully' });
  } catch (err) {
    console.log(err);
  }
});

const updateProductWebhook = catchAsync(async (req, res) => {
  console.log('==================updateProduct===================');
  console.log("--------------", JSON.stringify(req.body))
  res.status(200).jsend.success({ message: 'product updated successfully' });
  try {
    const body = req.body;
    const { id } = req.params;
    await cornServices.createUpdateProduct(body, 'update', id);
    // return res.status(200).jsend.success({ message: 'product updated successfully' });
  } catch (err) {
    console.log(err);
  }
});

const deleteProductWebhook = catchAsync(async (req, res) => {
  console.log('==================deleteProduct===================');
  res.status(200).jsend.success({ message: 'product deleted successfully' });
  try {
    const body = req.body;
    const { id } = req.params;
    await productService.deleteProduct(body.id);
  } catch (err) {
    console.log(err);
  }
});

const orderUpdateWebhook = catchAsync(async (req, res) => {
  const body = req.body;
  console.log('====================UPDATE=======================');
  res.status(200).jsend.success({ message: 'product updated successfully' });
  try {
    console.log("order updated data :", body);
    const { id } = req.params;

    await cornServices.updateOrderStatus(body, id);
    // return res.status(200).jsend.success({ message: 'product updated successfully' });
  } catch (err) {
    console.log(err);
  }
});

const fulfillmentUpdate = catchAsync(async (req, res) => {
  const body = req.body;
  res.status(200).jsend.success({ message: 'product updated successfully' });
  console.log('====================fulfillmentUpdate=======================');
  try {
    // console.log(body);
    const { id } = req.params;
  
    await cornServices.fulfillmentUpdate(body, id);
    // return res.status(200).jsend.success({ message: 'product updated successfully' });
  } catch (error) {
    console.log(error);
  }
});

const orderCancelledWebhook = catchAsync(async (req, res) => {
  console.log('====================Cancel=======================');
  res.status(200).jsend.success({ message: 'product updated successfully' });
  try {
    const body = req.body;
    console.log(JSON.stringify(body));
    const { id } = req.params;
    await cornServices.cancelOrderStatus(body, id);
    // await cornServices.createUpdateProduct(body, 'update', id);
    // return res.status(200).jsend.success({ message: 'product updated successfully' });
  } catch (error) {
    console.log(error);
  }
});

const orderFulfilledWebhook = catchAsync(async (req, res) => {
  console.log('====================orderFulfilled=======================');
  res.status(200).jsend.success({ message: 'product updated successfully' });
  try {
    const body = req.body;
    // console.log(body);
    const { id } = req.params;
    // await cornServices.createUpdateProduct(body, 'update', id);
    // return res.status(200).jsend.success({ message: 'product updated successfully' });
  } catch (error) {
    console.log(error);
  }
});

const orderPartiallyFulfilledWebhook = catchAsync(async (req, res) => {
  console.log('====================PartiallyFulfilled=======================');
  res.status(200).jsend.success({ message: 'product updated successfully' });
  try {
    const body = req.body;
    // console.log(body);
    const { id } = req.params;
    // await cornServices.createUpdateProduct(body, 'update', id);
    // return res.status(200).jsend.success({ message: 'product updated successfully' });
  } catch (error) {
    console.log(error);
  }
});

const createProductWebhookWix = catchAsync(async (req, res) => {
  try {
    logger.info(`===========create webhook===================`);
    res.status(200).jsend.success({});
    const { id } = req.params;
    const data = jwt.decode(req.body);
    let parsedData = JSON.parse(data.data);
    parsedData = JSON.parse(parsedData.data);
    await wixService.createUpdateProduct(parsedData.productId, 'create', id);
  } catch (err) {
    console.log(err);
  }
});

const updateProductWebhookWix = catchAsync(async (req, res) => {
  try {
    logger.info(`===========update webhook===================`, JSON.stringify(req.body));
    res.status(200).jsend.success({});
    const { id } = req.params;

    // const data = jwt.decode(body, process.env.PUBLIC_KEY, { algorithms: ['RS256'] });
    const data = jwt.decode(req.body);
    let parsedData = JSON.parse(data.data);
    parsedData = JSON.parse(parsedData.data);
    await wixService.createUpdateProduct(parsedData.productId, 'update', id);
  } catch (err) {
    console.log(err);
  }
});

const deleteProductWebhookWix = catchAsync(async (req, res) => {
  try {
    logger.info(`===========delete product webhook===================`);
    res.status(200).jsend.success({});
    const { id } = req.params;

    const data = jwt.decode(req.body);
    let parsedData = JSON.parse(data.data);
    parsedData = JSON.parse(parsedData.data);
    console.log("==parsedData==>",parsedData)
    await productService.deleteProduct(parsedData.productId, id);
  } catch (err) {
    console.log(err);
  }
});

// const createProductWebhookWooCommerce = catchAsync(async (req, res) => {
//   console.log(`===========create webhook woocommerce===================`);

//   const product = req.body;
//   const { id } = req.params;
//   // logger.info(`====create data==== ${product}`);
//   const platform = platformServiceFactory('woocommerce');

//   console.log('====create data====>>', product);
//   if (product?.id) {
//     if (product.status === 'publish' && product.type === 'simple') {
//       await platform.adapter.createUpdateProduct(product, 'create', id);
//     } else if (product.status === 'publish' && product.type === 'variable' && !product.parent.length) {
//       await platform.adapter.createUpdateProduct(product, 'create', id);
//     }
//     res.status(200).jsend.success({});
//   }
// });

const updateProductWebhookWooCommerce = catchAsync(async (req, res) => {
  logger.info(`===========update webhook woocommerce 1===================`);
  console.log("---------------",JSON.stringify(req.body))
  res.status(200).jsend.success({});
  const { product } = req.body;
  const { id } = req.params;
  if (product && product.id) {
    if (product.status !== 'draft') {
      if (product.status === 'publish' && product.type === 'simple') {
        await woocommerceService.createUpdateProduct(product, id);
      } else if (product.status === 'publish' && product.type === 'variable') {
        await woocommerceService.createUpdateProduct(product, id);
      }
    }
  }
});

const wixOrderFullfillmentCreateWebhook = catchAsync(async (req, res) => {
  logger.info(`===========wixOrderFullfillmentCreateWebhook update webhook===================`);
  res.status(200).jsend.success({});
  const { id } = req.params;
  const data = jwt.decode(req.body);
  let parsedData = JSON.parse(data.data);
  parsedData = JSON.parse(parsedData.data);
  logger.info(`===========wix Order Update parsedData=================== ${parsedData}`);
  await wixService.updateOrderStatus(parsedData);
});

const wixOrderCancel = catchAsync(async (req, res) => {
  logger.info(`===========wix Order Cancel webhook===================`);
  res.status(200).jsend.success({});
  const { id } = req.params;
  const data = jwt.decode(req.body);
  console.log('====body====', data, id);
  let parsedData = JSON.parse(data.data);
  parsedData = JSON.parse(parsedData.data);
  logger.info(`===========wix Order Cancel parsedData=================== ${parsedData}`);
  await wixService.cancelOrderStatus(parsedData.order);
  await cornServices.cancelOrderStatus(parsedData.order);
});

const squarespaceOrderWebhook = catchAsync(async (req, res) => {
  logger.info(`=========== Squarespace Order webhook===================`);
  const { id } = req.params;
  const parsedData = req.body;
  console.log('====body====', parsedData, id);
  logger.info(`=========== Squarespace Order parsedData=================== ${parsedData}`);
  res.status(200).jsend.success({});

  if (parsedData && parsedData.data && parsedData.data.update === 'CANCELED') {
    await squarespaceService.cancelOrderStatus(parsedData.data);
    parsedData.data.id = parsedData.data.orderId
    await cornServices.cancelOrderStatus(parsedData.data);
  } else {
    await squarespaceService.updateOrderStatus(parsedData.data);
  }
});

const squarespaceWebhookRegister = catchAsync(async (req, res) => {
  logger.info('----------register webhook squarespace--------------')
  await squarespaceService.registerWebhooks(req.params.id);
  res.status(200).jsend.success({});
})

const woocommerceOrderUpdate = catchAsync(async (req, res) => {
  console.log(`===========woocommerce order update===================`);
  res.status(200).jsend.success({});

  const product = req.body;
  const { id } = req.params;
  await woocommerceService.convertRemoteOrderToPlatformOrder(product, id);
  // if (product && product.id) {
  //   const platform = platformServiceFactory('woocommerce');
  //   if (product.status !== 'draft') {
  //     if (product.status === 'publish' && product.type === 'simple') {
  //       await platform.adapter.createUpdateProduct(product, id);
  //     } else if (product.status === 'publish' && product.type === 'variable') {
  //       await platform.adapter.convertRemoteOrderToPlatformOrder(product, id);
  //     }
  //   }
  // }
});

const deleteProductWebhookWooCommerce = catchAsync(async (req, res) => {
  try {
    console.log(`===========woocommerce product delete===================`);
    res.status(200).jsend.success({});
  
    const product = req.body;
    const { id } = req.params;
    const productId = product.id.toString()
    await productService.deleteProduct(productId, id);
    
  } catch (error) {
    console.log("error",error)
  }
});

module.exports = {
  createProductWebhook,
  updateProductWebhook,
  deleteProductWebhook,
  orderUpdateWebhook,
  orderFulfilledWebhook,
  orderPartiallyFulfilledWebhook,
  orderCancelledWebhook,
  createProductWebhookWix,
  updateProductWebhookWix,
  // createProductWebhookWooCommerce,
  updateProductWebhookWooCommerce,
  wixOrderFullfillmentCreateWebhook,
  wixOrderCancel,
  fulfillmentUpdate,
  squarespaceOrderWebhook,
  squarespaceWebhookRegister,
  woocommerceOrderUpdate,
  deleteProductWebhookWooCommerce,
  deleteProductWebhookWix,
};
