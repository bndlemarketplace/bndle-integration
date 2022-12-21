const WooCommerceRestApi = require("@woocommerce/woocommerce-rest-api").default;
const vendorModel = require('../../models/vendor.model');
const productModel = require('../../models/product.model');
const platformServiceFactory = require('../../services/fulfilmentPlatformServiceFactory');
const response = require('../../lib/helpers/response');
const userModel = require('../../models/user.model');
const catchAsync = require('../../utils/catchAsync');
const { deleteRemoteWebhooksService, registerAllWebhooksService } = require('../../services/vendor/vendorService');

// module.exports = {
//   async getVendors(req, res) {
//     const vendors = await vendorModel.find().lean();
//     res.send({
//       status: 'success',
//       data: {
//         vendors,
//       },
//     });
//   },

//   async getVendor(req, res) {
//     const vendorId = req.params.id;
//     const vendor = await vendorModel.findOne({ _id: vendorId }).lean();
//     res.send({
//       status: 'success',
//       data: {
//         vendor,
//       },
//     });
//   },

//   async getVendorOrders(req, res) {
//     const vendorId = req.params.id;
//     res.send({
//       status: 'success',
//       data: {
//         vendor: vendorId,
//         orders: [{
//           id: 12345,
//           vendorId: 1,
//           date: '01/07/2022 10:21:22',
//           items: [
//             {
//               sku: 'PROD-1',
//               name: 'test product',
//             },
//           ],
//         }],
//       },
//     });
//   },

//   async getVendorProducts(req, res) {
//     const vendorId = req.params.id;

//     const products = await productModel.find({ vendorId }).lean();
//     res.send({
//       status: 'success',
//       data: {
//         vendor: vendorId,
//         products,
//       },
//     });
//   },

//   async importVendorProducts(req, res) {
//     const vendorId = req.params.id;
//     const vendor = await vendorModel.findOne({ _id: vendorId }).lean();
//     let tempProduct, platformProduct, localProduct;
//     const importLog = [];

//     // get all the products from the remote platform
//     const platform = platformServiceFactory();
//     const products = await platform.product.get.all(vendor);

//     // TODO: Perform validation, better logging and edge cases
//     for (const product of products){
//       // check for duplicate object
//       localProduct = await productModel.find({remoteProductId: product.id}).lean();
//       if (localProduct.length === 0){
//         // convert the object to a platform product
//         platformProduct = platform.adapter.convertRemoteProductToPlatformProduct(product);
//         platformProduct.vendorId = vendorId;
//         platformProduct.source = JSON.stringify(product);
//         // instantiate a new Product Model
//         tempProduct = new productModel(platformProduct);
//         // save the product to the database
//         await tempProduct.save();
//         importLog.push('Product with id:' + product.id + ' imported into the database.');
//       }else{
//         importLog.push('Product with id:' + product.id + ' already exists in the database, ignoring.');
//       }
//     };

//     response(res, {data: importLog});
//   },
// };

const registerAllWebhooks = catchAsync(async (req, res) => {
  try {
    const vendorId = req.params.id;
    const vendor = await userModel.findOne({ _id: vendorId }).lean();
    const platform = platformServiceFactory();
    // console.log(platform);
    // console.log(process.env.APP_INTEGRATION_BASE_URL , "this is base url")
    // await platform.webhooks.registerWebhook(vendor);
    // await platform.webhooks.registerWebhook(vendor, 'orders/create', process.env.APP_INTEGRATION_BASE_URL + `v1/webhooks/${vendor._id}/orders/create`);
    console.log('this. 1 ');
    await platform.webhooks.registerWebhook(
      vendor,
      'orders/updated',
      process.env.APP_INTEGRATION_BASE_URL + `v1/webhooks/${vendor._id}/orders/updated`
    );
    await platform.webhooks.registerWebhook(
      vendor,
      'orders/cancelled',
      process.env.APP_INTEGRATION_BASE_URL + `v1/webhooks/${vendor._id}/orders/cancelled`
    );
    await platform.webhooks.registerWebhook(
      vendor,
      'orders/fulfilled',
      process.env.APP_INTEGRATION_BASE_URL + `v1/webhooks/${vendor._id}/orders/fulfilled`
    );
    await platform.webhooks.registerWebhook(
      vendor,
      'orders/partially_fulfilled',
      process.env.APP_INTEGRATION_BASE_URL + `v1/webhooks/${vendor._id}/orders/partially-fulfilled`
    );
    // products
    await platform.webhooks.registerWebhook(
      vendor,
      'products/create',
      process.env.APP_INTEGRATION_BASE_URL + `v1/webhooks/${vendor._id}/products/create`
    );
    await platform.webhooks.registerWebhook(
      vendor,
      'products/update',
      process.env.APP_INTEGRATION_BASE_URL + `v1/webhooks/${vendor._id}/products/update`
    );

    return res.status(200).jsend.success('webhook registered successfully');
  } catch (err) {
    console.log('err');
    return res.status(200).jsend.success(err.message);
  }
});

const deleteRemoteWebhooks = catchAsync(async (req, res) => {
  const vendorId = req.params.id;
  const vendor = await userModel.findOne({ _id: vendorId }).lean();
  const platform = platformServiceFactory();

  await platform.webhooks.deleteAllRemoteWebhooks(vendor);

  return res.status(200).jsend.success({ message: 'success' });
});

const registerAllWoocommerceWebhooks = catchAsync(async (req, res) => {
  try {
    const vendorId = req.params.id;
    const vendor = await userModel.findOne({ _id: vendorId }).lean();
    const platform = platformServiceFactory('woocommerce');

    // products
    // await platform.webhooks.registerWebhook(
    //   vendor,
    //   'Add product',
    //   'product.created',
    //   process.env.APP_BASE_URL + `v1/webhooks/${vendor._id}/woocommerce/products/create`
    // );
    await platform.webhooks.registerWebhook(
      vendor,
      'Update order',
      'order.updated',
      process.env.APP_INTEGRATION_BASE_URL + `v1/webhooks/${vendor._id}/woocommerce/orders/update`
    );

     await platform.webhooks.registerWebhook(
      vendor,
      'Product update',
      'product.updated',
      process.env.APP_INTEGRATION_BASE_URL + `v1/webhooks/${vendor._id}/woocommerce/products/update`
    );
    return res.status(200).jsend.success('webhook registered successfully');
  } catch (err) {
    return res.status(200).jsend.success(err.message);
  }
});

const registerWebhooks = catchAsync(async (req, res) => {
  try {
    const vendors = await userModel.find({ connectionType: 'shopify' }).select('_id');
    const vendorIds = [];
    await Promise.all(
      vendors.map(async (vendor) => {
        const vendorById = await userModel.findOne({ _id: vendor }).lean();
        await deleteRemoteWebhooksService(vendorById);
        await registerAllWebhooksService(vendorById);
      })
    );

    return res.status(200).jsend.success({ message: 'success', data: vendorIds });
  } catch (error) {
    return res.status(200).jsend.success(error.message);
  }
});

module.exports = {
  registerAllWebhooks,
  deleteRemoteWebhooks,
  registerAllWoocommerceWebhooks,
  registerWebhooks,
};
