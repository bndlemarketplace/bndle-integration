const express = require('express');
const controller = require('../../controllers/product/productController')
const image = require('../../utils/s3-bucket')

const router = express.Router();

router.route('/initialProductSync/shopify').post(controller.initialProductSyncShopify);
router.route('/publishProductToShopify').post(controller.publishProductToShopify);
router.route('/downloadImage').get(image.downloadImgAndUploadToS3)
router.route('/updateProductManually').post(controller.productUpdateShopify)
router.route('/delete-algolia-product').post(controller.deleteAlgoliaProduct)
router.route('/update-algolia-product').post(controller.updateProductToAlgolia)
router.route('/get-algolia-product').get(controller.getProductToAlgolia)
router.route('/sync/all').get(controller.syncAllProducts);

module.exports = router;