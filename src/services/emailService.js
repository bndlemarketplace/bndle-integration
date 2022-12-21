const AWS = require('aws-sdk');
const fs = require('fs');
const moment = require('moment');
const handlebars = require('handlebars');
const config = require('../config/config');
const logger = require('../config/logger');
const User = require('../models/user.model');
const { Product } = require('../models');
AWS.config.update({ region: 'eu-west-2' });
const email = config.emailConfig.emailFrom;

const sendEmail = async (to, sub, textData) => {
  // Create sendEmail params
  const params = {
    Destination: {
      /* required */ ToAddresses: [`${to}`],
    },
    Message: {
      Body: {
        Html: {
          Charset: 'UTF-8',
          Data: `${textData}`,
        },
      },
      Subject: {
        Charset: 'UTF-8',
        Data: `${sub}`,
      },
    },
    Source: `bndle <${email}>`,
    ReplyToAddresses: [
      `${email}`,
      /* more items */
    ],
  };
  // Create the promise and SES service object
  const sendPromise = new AWS.SES({ apiVersion: '2010-12-01' }).sendEmail(params).promise();

  // Handle promise's fulfilled/rejected states
  sendPromise
    .then(function (data) {
      logger.info(`MessageId: ${data.MessageId}`);
      return data.MessageId;
    })
    .catch(function (err) {
      logger.error(err, err.stack);
      return false;
    });
};

/* order shipped email */
const orderShippedEmail = async (to, order, trackingId = '', trackingUrl = '') => {
  const source = fs.readFileSync(`${__dirname}/../emailTemplate/orderShippedEmail.hbs`, { encoding: 'utf8', flag: 'r' });
  const template = handlebars.compile(source);

  // const dt = new Date(order.createdAt);
  const orderDetails = {
    orderNo: order.orderCode,
    shippingCostSum: 0,
    // orderDate: moment(dt).format('d MMM,YYYY HH:mm:ss'),
    totalAmount: order.total.toFixed(2),
    subtotal: order.subtotal.toFixed(2),
    customerName: order.customerId.firstName,
    discountPercentage: order.discount.percentage,
    discountAmount: order.discount.discountAmount,
    productDetails: [],
  };

  let shippingCostSum = 0;

  // eslint-disable-next-line no-plusplus
  for (let index = 0; index < order.product.length; index++) {
    const product = order.product[index];
    // eslint-disable-next-line no-await-in-loop
    // const vendorDetails = await User.findOne({ _id: vendor.vendorId });
    // eslint-disable-next-line no-plusplus
    // for (let i = 0; i < vendor.product.length; i++) {
    // const product = vendor.product[i];

    // eslint-disable-next-line no-await-in-loop
    // const productData = await productService.getProductDetailsByBndleId(product.productId);
    const productData = await Product.findOne({ venderProductPlatformId: product.vendorProductId }).lean();

    shippingCostSum += order.shippingOptions.shipment.price;
    const data = {
      vendorName: order.vendorId.name,
      vendorEmail: order.vendorId.email,
      quantity: product.quantity,
      price: product.productTotal.toFixed(2),
      productName: productData.title,
      shippingOption: order.shippingOptions.shipment.name,
      shippingPrice: order.shippingOptions.shipment.price,
      shippingInfo: order.shippingAddress,
      billingInfo: order.billingAddress,
      trackingId,
      trackingUrl,
      VAT: product.VAT ? product.VAT : 0,
    };
    orderDetails.productDetails.push(data);
    // }
  }
  orderDetails.shippingCostSum = shippingCostSum;
  // orderDetails.subtotal = order.total - shippingCostSum;
  console.log('orderDetails', orderDetails);
  const data = { orderDetails };
  const result = template(data);
  const subject = 'Your order has been shipped';
  const res = await sendEmail(to, subject, result);
  return res;
};

module.exports = {
  sendEmail,
  orderShippedEmail,
};
