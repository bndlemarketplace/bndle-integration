const vendorController = require('../../controllers/vendor/vendorController');

// module.exports = ({ server, errorHandler }) => {
//   server.get('/vendors', (req, res) => {
//     vendorController.getVendors(req, res);
//   });
//   server.get('/vendors/:id', (req, res) => {
//     vendorController.getVendor(req, res);
//   });
//   server.get('/vendors/:id/orders', (req, res) => {
//     vendorController.getVendorOrders(req, res);
//   });
//   server.get('/vendors/:id/products', (req, res) => {
//     vendorController.getVendorProducts(req, res);
//   });
//   server.get('/vendors/:id/products/import', (req, res) => {
//     vendorController.importVendorProducts(req, res);
//   });

const express = require('express');
const controller = require('../../controllers/product/productController');

const router = express.Router();

router.route('/:id/webhooks/register-all').get(vendorController.registerAllWebhooks);
router.route('/:id/webhooks/delete-remote-webhooks').get(vendorController.deleteRemoteWebhooks);
router.route('/register-webhooks').post(vendorController.registerWebhooks);
// router.route('/:id/webhooks/get-all').get(vendorController.)

module.exports = router;
/**
 * @swagger
 *
 * definitions:
 *   NewVendor:
 *     type: object
 *     required:
 *       - id
 *     properties:
 *       id:
 *         type: integer
 *   Vendor:
 *     allOf:
 *       - $ref: '#/definitions/NewVendor'
 *       - required:
 *         - id
 *       - properties:
 *         id:
 *           type: integer
 *           format: int64
 *
 */

/**
 * @swagger
 *
 * /vendors:
 *   get:
 *     description: Gets all vendors
 *     tags:
 *       - Vendors
 *     security:
 *       - Authorization: []
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: returns an object containing an array of vendors *
 */
// };
