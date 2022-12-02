const express = require('express');
const controller = require('../../controllers/product/productController')
const image = require('../../utils/s3-bucket')

const router = express.Router();

router.route('/initialProductSync/shopify').post(controller.initialProductSyncShopify);
router.route('/publishProductToShopify').post(controller.publishProductToShopify);
router.route('/downloadImage').get(image.downloadImgAndUploadToS3)

module.exports = router;