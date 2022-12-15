
const httpStatus = require('http-status');
const ApiError = require('../../utils/ApiError');
const logger = require('../../config/logger');
const constVer = require('../../config/constant');
const cornServices = require('../../cornJob/shopifyCorn');
const { Product, ProductVariants, VenderOrder, Order, User } = require('../../models');
const emailService = require('../emailService');
const SQObject = require('./index');

const registerWebhooks = async (userId) => {
    // subscribe webhooks
    try {
        const userData = await User.findById(userId);
        if (userData) {
            const sqObj = new SQObject();
            await sqObj.webhook.put.subscribe(userData);
            logger.info('webhook suubscribed for vendorId ' + userData.name);
        }
    } catch (e) {
        logger.info('webhook not registered for userId ' + userId);
        logger.info(e);
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

                            logger.info(`dbProduct ${dbProduct}`);

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
    if (product.variants && product.variants.length) {

        for (let index = 0; index < product.variants.length; index++) { // loop all variants
            const variant = product.variants[index];

            let mappedOption = [];
            for (const attr in variant.attributes) {
                mappedOption.push({
                    name: attr,
                    value: variant.attributes[attr]
                })
            };

            let mappedVariantImages = [];
            if (variant.image) {
                mappedVariantImages.push({
                    bndleImageId: variant.image.id,
                    bndleProductId: dbProduct._id.toString(),
                    position: variant.image.orderIndex,
                    variantPlatformSrc: variant.image.url,
                    src: variant.image.url,
                })
            }


            const variantObj = {
                productId: dbProduct._id,
                venderProductPlatformVariantId: variant.id,
                price: variant.pricing.basePrice.value,
                position: index + 1,
                options: mappedOption,
                venderSku: variant.sku,
                sku: variant.sku,
                title: variant.attributes ? Object.values(variant.attributes).join(' ') : '',
                inventoryQuantity: variant.stock.quantity,
                openingQuantity: variant.stock.quantity,
                weight: variant.shippingMeasurements.weight.value,
                weightUnit: variant.shippingMeasurements.weight.unit,
                images: mappedVariantImages,
                isDeleted: false,
                isDefault: product.variants.length === 1 ? true : false,
                isEnable: true,
                isCompatible: true
            };

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
                            inventoryQuantity: variantEl.quantity,
                            openingQuantity: variantEl.quantity,
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

module.exports = {
    squarespaceProductSync,
    updateOrderStatus,
    cancelOrderStatus
}