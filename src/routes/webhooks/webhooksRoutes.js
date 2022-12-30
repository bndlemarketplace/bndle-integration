const express = require('express');
const webhookController = require('../../controllers/webhook/webhook');

const router = express.Router();

// shopify webhooks
router.route('/:id/products/create').post(webhookController.createProductWebhook);
router.route('/:id/products/update').post(webhookController.updateProductWebhook);
// shopify order
router.route('/:id/orders/updated').post(webhookController.orderUpdateWebhook);
router.route('/:id/fulfillments/update').post(webhookController.fulfillmentUpdate);
router.route('/:id/orders/cancelled').post(webhookController.orderCancelledWebhook);
router.route('/:id/orders/fulfilled').post(webhookController.orderFulfilledWebhook);
router.route('/:id/orders/partially-fulfilled').post(webhookController.orderPartiallyFulfilledWebhook);

/* Wix webhook routes */
router.route('/:id/wix/products/create').post(webhookController.createProductWebhookWix);
router.route('/:id/wix/products/update').post(webhookController.updateProductWebhookWix);

/* Woocommerce webhook routes */
// router.route('/:id/woocommerce/products/create').post(webhookController.createProductWebhookWooCommerce);
router.route('/:id/woocommerce/products/update').post(webhookController.updateProductWebhookWooCommerce);
router.route('/:id/woocommerce/orders/update').post(webhookController.woocommerceOrderUpdate);

/* Wix order webhook */
router.route('/:id/wix/orders/fullfillmentCreate').post(webhookController.wixOrderFullfillmentCreateWebhook);
router.route('/:id/wix/orders/cancel').post(webhookController.wixOrderCancel);

// squarespace webhooks
router.route('/:id/squarespace/orders').post(webhookController.squarespaceOrderWebhook);
router.route('/:id/squarespace/register').post(webhookController.squarespaceWebhookRegister);
module.exports = router;
