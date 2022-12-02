const jwt = require('jsonwebtoken');
const cornServices = require('../../cornJob/shopifyCorn');
const catchAsync = require('../../utils/catchAsync');
const ApiError = require('../../utils/ApiError');
const wixService = require('../../services/wix/wixService');
const logger = require('../../config/logger');
const User = require('../../models/user.model');

// module.exports = {

const createProductWebhook = catchAsync(async (req, res) => {
  console.log('==================createProduct===================');
  const body = req.body;
  const { id } = req.params;
  await cornServices.createUpdateProduct(body, 'create', id);
  return res.status(200).jsend.success({ message: 'product created successfully' });
});

const updateProductWebhook = catchAsync(async (req, res) => {
  console.log('==================updateProduct===================');
  const body = req.body;
  const { id } = req.params;
  await cornServices.createUpdateProduct(body, 'update', id);
  return res.status(200).jsend.success({ message: 'product updated successfully' });
});

const orderUpdateWebhook = catchAsync(async (req, res) => {
  const body = req.body;
  console.log('====================UPDATE=======================');
  // console.log(body);
  const { id } = req.params;

  await cornServices.updateOrderStatus(body, id);
  return res.status(200).jsend.success({ message: 'product updated successfully' });
});

const fulfillmentUpdate = catchAsync(async (req, res) => {
  const body = req.body;
  console.log('====================fulfillmentUpdate=======================');
  // console.log(body);
  const { id } = req.params;

  await cornServices.fulfillmentUpdate(body, id);
  return res.status(200).jsend.success({ message: 'product updated successfully' });
});

const orderCancelledWebhook = catchAsync(async (req, res) => {
  console.log('====================Cancel=======================');
  const body = req.body;
  console.log(body);
  const { id } = req.params;
  // await cornServices.createUpdateProduct(body, 'update', id);
  return res.status(200).jsend.success({ message: 'product updated successfully' });
});

const orderFulfilledWebhook = catchAsync(async (req, res) => {
  console.log('====================orderFulfilled=======================');
  const body = req.body;
  console.log(body);
  const { id } = req.params;
  // await cornServices.createUpdateProduct(body, 'update', id);
  return res.status(200).jsend.success({ message: 'product updated successfully' });
});

const orderPartiallyFulfilledWebhook = catchAsync(async (req, res) => {
  console.log('====================PartiallyFulfilled=======================');
  const body = req.body;
  console.log(body);
  const { id } = req.params;
  // await cornServices.createUpdateProduct(body, 'update', id);
  return res.status(200).jsend.success({ message: 'product updated successfully' });
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
    logger.info(`===========update webhook===================`);
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
});

module.exports = {
  createProductWebhook,
  updateProductWebhook,
  orderUpdateWebhook,
  orderFulfilledWebhook,
  orderPartiallyFulfilledWebhook,
  orderCancelledWebhook,
  createProductWebhookWix,
  updateProductWebhookWix,
  wixOrderFullfillmentCreateWebhook,
  wixOrderCancel,
  fulfillmentUpdate,
};
