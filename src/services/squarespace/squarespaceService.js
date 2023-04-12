
const httpStatus = require('http-status');
const mongoose = require('mongoose');
const { APP_INTEGRATION_BASE_URL } = process.env;
const ApiError = require('../../utils/ApiError');
const logger = require('../../config/logger');
const constVer = require('../../config/constant');
const cornServices = require('../../cornJob/shopifyCorn');
const productService = require('../../services/product.service');
const { Product, ProductVariants, VenderOrder, Order, User } = require('../../models');
const emailService = require('../emailService');
const { AddJobPublishProductToShopify } = require('../../lib/jobs/queue/addToQueue');
const SQObject = require('./index');

const registerWebhooks = async (userId) => {
    // subscribe webhooks
    try {
        const userData = await User.findById(userId);
        if (userData) {
            const sqObj = new SQObject();
            let flag = true;
            let webhook;
            const data = {
                endpointUrl: `${APP_INTEGRATION_BASE_URL}v1/webhooks/${userData._id}/squarespace/orders`,
                topics: [
                    "order.create", "order.update"
                ]
            }

            const ifAlreadyReg = await sqObj.webhook.get.all(userData);

            if (ifAlreadyReg && ifAlreadyReg.webhookSubscriptions && ifAlreadyReg.webhookSubscriptions.length) {
                webhook = ifAlreadyReg.webhookSubscriptions.find((i) => i.endpointUrl === data.endpointUrl);
                flag = webhook ? false : true;
            }
            if (flag) {
                await sqObj.webhook.put.subscribe(userData, data);
                logger.info('webhook suubscribed for vendorId ' + userData.name);
            } else {
                logger.info('Webhook already subscriped webhookId ' + webhook.id);
            }
        }
    } catch (e) {
        logger.info('Error: webhook not registered for userId ' + userId);
        logger.info(e.message);
    }
}

const squarespaceProductSync = async (userId) => {
    try {
        const userData = await User.findById(userId);
        if (userData) {
            if (userData.autoProductSynced === true) {
                throw new ApiError(httpStatus.BAD_REQUEST, 'already product synced');
            }

            await registerWebhooks(userId);

            (async () => {

                const sqObj = new SQObject();
                let getNext = true;
                let cursor = '';

                while (getNext) {
                    const { pagination, products } = await sqObj.product.get.all(userData, cursor);
                    getNext = pagination && pagination.hasNextPage && products.length ? true : false;
                    cursor = pagination.nextPageCursor;

                    if (products.length) {
                        let product;
                        for (let index = 0; index < products.length; index++) {
                            product = products[index];

                            const productObj = sqObj.adapter.convertPlatformProductToRemoteProduct(product, userId, userData.name);
                            // create product
                            const dbProduct = await Product.findOneAndUpdate(
                                { venderProductPlatformId: productObj.venderProductPlatformId, productSource: constVer.model.product.productSourceEnum[4] },
                                productObj,
                                {
                                    upsert: true,
                                    new: true,
                                }
                            );

                            logger.info(`dbProduct added ${dbProduct._id}`);

                            if (dbProduct) {
                                // for create variant of product
                                await productVariantSync(product, dbProduct);
                                logger.info(`variants added for productID ${dbProduct._id}`);
                            } else {
                                const loggerPayload = {
                                    title: 'Product sync',
                                    type: constVer.model.logger.typeEnum[4],
                                    logs: productObj,
                                    level: constVer.model.logger.levelEnum[4],
                                };
                                await LoggerService.createLogger(loggerPayload);
                            }
                        }
                    }
                }
            })().catch((err) => {
                throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, err.message);
            });
            // await User.findByIdAndUpdate(userId, { autoProductSynced: true });
            // return true;
        } else {
            throw new ApiError(httpStatus.NOT_FOUND, 'No User Data');
        }

    } catch (error) {
        logger.info(`squarespaceProductSync-error ${error}`);
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, error.message);
    }
}

const productVariantSync = async (product, dbProduct) => {
    // for create variant of product
    const sqObj = new SQObject();

    if (product.variants && product.variants.length) {

        for (let index = 0; index < product.variants.length; index++) { // loop all variants
            const variant = product.variants[index];

            const variantObj = sqObj.adapter.convertPlatformVariantToRemoteVariant(variant, product, dbProduct, index);

            await ProductVariants.findOneAndUpdate({ venderProductPlatformVariantId: variant.id, }, variantObj, {
                upsert: true,
                new: true,
            });
        }
    }
}

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

const cancelOrderStatus = async (order) => {
    console.log('order.fulfillmentStatus ', order.update);
    try {
        // get vendor order by order id
        const vendorOrder = await VenderOrder.findOne({ venderPlatformOrderId: order.orderId }).populate({ path: 'vendorId' });

        if (!vendorOrder) {
            return true;
        }

        let currentStatus = vendorOrder.status;
        vendorOrder.status = constVer.model.order.vendorOrderStatus.REQUEST_DECLINED;

        if (currentStatus !== vendorOrder.status) { // check as webhook is called multiple times

            const statusHistoryObj = {
                status: vendorOrder.status,
                date: new Date(),
            };
            vendorOrder.statusHistory.push(statusHistoryObj);

            const vendorOrderData = await VenderOrder.findOneAndUpdate({ venderPlatformOrderId: order.orderId }, vendorOrder, {
                // upsert: true,
                new: true,
            });

            // update the stock back after cancel
            let allVariantIds = [];
            (vendorOrderData.product || []).forEach((i) => { if (i.vendorVariantId) { allVariantIds.push(i.vendorVariantId) } });
            allVariantIds = allVariantIds.join(',');

            const sqObj = new SQObject();
            const allVaraintsArr = await sqObj.inventory.get.one(vendorOrder.vendorId, allVariantIds);

            if (allVaraintsArr && allVaraintsArr.inventory && allVaraintsArr.inventory.length) {

                for (let index = 0; index < vendorOrderData.product.length; index++) {
                    let orderProduct = vendorOrderData.product[index];

                    let variantEl = allVaraintsArr.inventory.find((i) => i.variantId === orderProduct.vendorVariantId);
                    // eslint-disable-next-line no-await-in-loop
                    const updatedVariant = await ProductVariants.findOneAndUpdate(
                        { _id: orderProduct.variantRef },
                        {
                            inventoryQuantity: variantEl.isUnlimited ? constVer.model.product.quantityLimit + "" : variantEl.quantity,
                            openingQuantity: variantEl.isUnlimited ? constVer.model.product.quantityLimit + "" : variantEl.quantity,
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
                            logger.error(err);
                            throw new ApiError(httpStatus.BAD_REQUEST, 'something went wrong with push product to shopify');
                        }
                    }
                }
            }
            await updateMainOrderStatus(vendorOrderData);
        }
        return true;
    } catch (err) {
        console.log(err);
    }
};

const updateOrderStatus = async (order) => {
    logger.info('order====>>>', order);
    try {
        const vendorOrder = await VenderOrder.findOne({ venderPlatformOrderId: order.orderId }).populate({ path: 'vendorId' }).populate({ path: 'customerId' }).lean();

        if (!vendorOrder || !order || !order.update) {
            return true;
        }
        // SQ status = `FULFILLED`, `REFUNDED`, `CANCELED`, `MARKED_PENDING`, or `EMAIL_UPDATED`
        if (order.update === 'EMAIL_UPDATED') {
            return true;
        }

        let currentStatus = vendorOrder.status;
        if (order.update === 'FULFILLED') {
            vendorOrder.status = constVer.model.order.vendorOrderStatus.SHIPPED;
        }

        if (order.update === 'MARKED_PENDING') {
            vendorOrder.status = constVer.model.order.vendorOrderStatus.NEW;
        }

        if (vendorOrder.status !== currentStatus) {

            if (order.update === 'FULFILLED') {
                // get all track info from oorder object
                const sqObj = new SQObject();
                const sqOrder = await sqObj.order.get.one(vendorOrder.vendorId, order.orderId);

                if (sqOrder && sqOrder.fulfillments && sqOrder.fulfillments.length) {
                    const od = sqOrder.fulfillments[0];

                    vendorOrder.trackingId = od.trackingNumber;
                    vendorOrder.trackingUrl = od.trackingUrl;
                    vendorOrder.carrier = od.carrierName;
                }
            }

            const statusHistoryObj = {
                status: vendorOrder.status,
                date: new Date(),
            };

            vendorOrder.statusHistory.push(statusHistoryObj);

            const vendorOrderData = await VenderOrder.findOneAndUpdate({ venderPlatformOrderId: order.orderId }, vendorOrder, {
                upsert: true,
                new: true,
            });
            logger.info('+++++++++++ webhook updated vendor+++++++++++++');
            logger.info(vendorOrderData);

            await updateMainOrderStatus(vendorOrderData);

            if (order.update === 'FULFILLED') { // email when shipped
                const email = vendorOrder.customerId.email;
                await emailService.orderShippedEmail(email, vendorOrder, vendorOrderData.trackingId, vendorOrderData.trackingUrl);
            }
        }
        return true;
    } catch (err) {
        logger.info(err);
    }
};

const updateAllVendorProducts = async (vendorId = '', productId = '') => {
    try {
        const allVendors = vendorId ?
            await User.find({ _id: vendorId, connectionType: constVer.model.product.productSourceEnum[4] }, { credentials: 1, name: 1, connectionType: 1 }).lean() :
            await User.find({ connectionType: constVer.model.product.productSourceEnum[4] }, { credentials: 1, name: 1, connectionType: 1 }).lean();

        let vendor;

        for (let i = 0; i < allVendors.length; i++) {
            vendor = allVendors[i];
            const sqObj = new SQObject();
            let getNext = true;
            let cursor = '';

            try {
                while (getNext) {

                    const { pagination, products } = productId ?
                        await sqObj.product.get.one(vendor, productId) :
                        await sqObj.product.get.all(vendor, cursor);

                    getNext = pagination && pagination.hasNextPage && products.length ? true : false;
                    cursor = pagination.nextPageCursor;

                    if (products && products.length) {
                        let product;
                        for (let index = 0; index < products.length; index++) {
                            product = products[index];

                            const dbProduct = await Product.findOne({ venderProductPlatformId: product.id });
                            if (dbProduct) {
                                const productObj = sqObj.adapter.updateRemoteProductFromPlatformProduct(product, dbProduct);
                                // create product
                                const dbProductRes = await Product.findOneAndUpdate(
                                    {
                                        venderProductPlatformId: productObj.venderProductPlatformId,
                                        productSource: constVer.model.product.productSourceEnum[4],
                                    },
                                    productObj,
                                    {
                                        upsert: true,
                                        new: true,
                                    }
                                );

                                logger.info(`dbProduct upated in cron ${dbProductRes._id}`);

                                if (dbProductRes) {
                                    // for create variant of product
                                    if (product.variants && product.variants.length) {
                                        const dbVariants = await ProductVariants.find({ productId: mongoose.Types.ObjectId(dbProduct._id) });

                                        for (let index = 0; index < product.variants.length; index++) {
                                            // loop all variants

                                            const variant = product.variants[index];
                                            const dbVariant = dbVariants.find((v) => v.venderProductPlatformVariantId === variant.id);
                                            const variantObj = sqObj.adapter.updateRemoteVariantFromPlatformVariant(variant, dbVariant, dbProduct);

                                            await ProductVariants.findOneAndUpdate({ venderProductPlatformVariantId: variant.id }, variantObj, {
                                                upsert: true,
                                                new: true,
                                            });

                                            logger.info(`dbProduct varinats updated in cron, venderProductPlatformVariantId: ${variant.id}`);
                                        }
                                    }

                                    try {
                                        if (dbProduct.status === 'PUBLISHED') {
                                            AddJobPublishProductToShopify(dbProduct._id);
                                        }
                                        // await cornServices.publishProductToShopify(dbProduct._id);
                                    } catch (err) {
                                        logger.error(err);
                                        logger.error('something went wrong with push product to shopify for product ' + dbProduct._id);
                                        continue;
                                        // throw new ApiError(httpStatus.BAD_REQUEST, 'something went wrong with push product to shopify');
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                logger.error(e);
                logger.error('SQ Error while running cron vendor product update: ' + ((e || {}).config || {}).url);
                logger.error(
                    'SQ Error while running cron vendor product update: ' + (((e || {}).response || {}).data || {}).message
                );
                continue;
            }
        }
    } catch (e) {
        logger.error(e);
        logger.error('SQ Error while running cron vendor product update: ' + ((e || {}).config || {}).url);
        logger.error('SQ Error while running cron vendor product update: ' + (((e || {}).response || {}).data || {}).message);
    }
};

const deleteVendorProducts = async (vendorId = '', productsId = '') => {

    const allVendors = await User.find({ connectionType: constVer.model.product.productSourceEnum[4] }, { credentials: 1, name: 1, connectionType: 1 }).lean();
    let vendor;

    for (let i = 0; i < allVendors.length; i++) {
        vendor = allVendors[i];
        const sqObj = new SQObject();

        try {
            const allProducts = await Product.find({ productSource: constVer.model.product.productSourceEnum[4], vendorId: vendor._id, isDeleted: false }, { title: 1, venderProductPlatformId: 1 }).lean();

            for (let p = 0; p < allProducts.length; p++) {
                const prod = allProducts[p];
                try {
                    await sqObj.product.get.one(vendor, prod.venderProductPlatformId);

                } catch (e) {
                    if (e?.response?.status === 404) { // if product is not found means deleted 
                        await productService.deleteProduct(prod.venderProductPlatformId);
                        console.log(`Squarespace product deleted for vendor ${vendor._id}, vendor product Id: ${prod.venderProductPlatformId}`)
                    }
                }
            }

        } catch (e) {
            logger.error(e);
            logger.error('SQ Error while running cron vendor product delete: ' + ((e || {}).config || {}).url);
            logger.error('SQ Error while running cron vendor product delete: ' + (((e || {}).response || {}).data || {}).message);
        }
    }
}

const syncAllProducts = async () => {
  const users = await User.find({
    connectionType: 'squarespace',
    isDeleted : false
  }).lean();

  for (let index = 0; index < users.length; index++) {
    const user = users[index];
    const dbProducts = await Product.find({
      vendorId: user._id,
    }).lean();

    if (user.connectionType === 'squarespace') {
      for (let index = 0; index < dbProducts.length; index++) {
        try {
          const dbProduct = dbProducts[index];
          await updateAllVendorProducts(user._id, dbProduct.venderProductPlatformId);
        } catch (error) {
          console.log('🚀 ~ file: squarespaceService.js:517 ~ syncAllProducts ~ error:', error);
        }
      }
    }
  }
};

module.exports = {
    squarespaceProductSync,
    updateOrderStatus,
    cancelOrderStatus,
    updateAllVendorProducts,
    deleteVendorProducts,
    registerWebhooks,
    syncAllProducts
}