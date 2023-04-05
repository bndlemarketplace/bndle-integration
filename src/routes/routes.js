const express = require('express');
const productRoute = require('./products/productRoutes');
const config = require('../config/restifyConfig');
const webhookRoute = require('./webhooks/webhooksRoutes');
const vendorRoute = require('./vendors/vendorRoutes');
const fs = require('fs');
const { encode } = require('html-entities');
const logger = require('../config/logger')
const { Product } = require('../models');
const { ProductVariants } = require('../models');
const { updateAllVendorProducts } = require('../services/squarespace/squarespaceService');
// const { AddJobCallTodos } = require('../lib/jobs/queue/addToQueue');
const path = require('path');
const router = express.Router();

const defaultRoutes = [
  {
    path: '/products',
    route: productRoute,
  },
  {
    path: '/webhooks',
    route: webhookRoute,
  },
  {
    path: '/vendors',
    route: vendorRoute,
  },
];

// // test 
// router.route('/check').get(async (req, res) => {
//   // await updateAllVendorProducts()
//   await deleteVendorProducts()
// });

// router.route('/checktodos').get(((req, res) => {
//   AddJobCallTodos(req.body.id);
//   res.json('done')
// }));


router.route('/generate').get(async (req, res) => {
 



  function getUrlFromBucket(fileName) {
    return `https://${process.env.S3_IMAGE_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
  }
  function getImage(product) {
    let firstImage = product.images;
    return firstImage && firstImage[0]
      ? firstImage[0]?.src.includes("http")
        ? firstImage[0]?.src
        : getUrlFromBucket(firstImage[0]?.src)
      : `${process.env.CUSTOMER_APP_URL}/asset/product-img01.png`;
  }
  async function getProductCount() {
    try {
      const count = await Product.countDocuments({});
      return count;
    } catch (err) {
      console.log(err);
      return 0;
    }
  }


  const directoryPath = path.join(__dirname, '../public/merchants/products.xml');
  const writeStream = fs.createWriteStream(directoryPath);

  // Write the XML header
  writeStream.write('<?xml version="1.0"?>\n');
  writeStream.write('<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">\n');
  writeStream.write('<channel>\n');
  writeStream.write('<title>Example - Google Store</title>\n');
  writeStream.write('<link>https://store.google.com</link>\n');
  writeStream.write('<description>This is an example of a basic RSS 2.0 document containing a single item</description>\n');


  const batchSize = 500;
  // Call the getProductCount function
  getProductCount().then(async count => {
    let skip = 0;
    while (skip < count) {
      let products = await Product.aggregate([
        {
            $lookup: {
                from: "users",
                localField: "vendorId",
                foreignField: "_id",
                as: "vendor"
            }
        },
        {
            $project: {
                _id: 1,
                title: 1,
                bndleId: 1,
                description: 1,
                vendorName: 1,
                vendorId: 1,
                bndleId: 1,
                images: 1,
                options: 1,
                standardShipping: {
                    $arrayElemAt: [
                        {
                            $ifNull: ["$vendor.standardShipping", [null]]
                        },
                        0
                    ]
                }
            }
        },
        {
            $lookup: {
                from: "productvariants",
                localField: "_id",
                foreignField: "productId",
                as: "variants"
            }
        },
        {
            $match: {
                description: { $type: "string", $nin: ["", null] },
                bndleId: { $exists: true, $nin: ["", null] },
                vendorName: { $type: "string", $nin: ["", null] },
                "variants.sku": { $exists: true, $nin: ["", null] },
                standardShipping: { $nin: [null, ""] }
            }
        },
        {
            $skip: skip
        },
        {
            $limit: batchSize
        }
    ]);
    
    



    
      for (let product of products) {


        // Write the XML data for each product to the file
        writeStream.write('<item>\n');
        writeStream.write(`<g:id>${product._id}</g:id>\n`);
        writeStream.write(`<g:title>${encode(product.title, { level: 'xml' })}</g:title>\n`);
        writeStream.write(`<g:description>${encode(product.description, { level: 'xml' })}</g:description>\n`);
        writeStream.write(`<g:link>${process.env.CUSTOMER_APP_URL}/product-detail?id=${product.bndleId}</g:link>\n`);
        writeStream.write(`<g:image_link>${getImage(product)}</g:image_link>\n`);
        writeStream.write(`<g:condition>new</g:condition>\n`);
        writeStream.write(`<g:availability>in_stock</g:availability>\n`);
        writeStream.write(`<g:price>${product?.variants[0]?.price} GBP</g:price>\n`);
        writeStream.write(`<g:gtin></g:gtin>\n`);
        writeStream.write(`<g:brand>${encode(product.vendorName,{level  :'xml'})}</g:brand>\n`);
        writeStream.write("<g:age_group>newborn</g:age_group>\n");
        writeStream.write("<g:gender>unisex</g:gender>\n");
        writeStream.write(`<g:color>Black/White/Grey/Green/Blue/Pink</g:color>\n`);
        writeStream.write(`<g:mpn>${product?.variants[0]?.sku}</g:mpn>\n`);
        writeStream.write(`<g:shipping>\n`);
        writeStream.write(`<g:country>GB</g:country>\n`);
        writeStream.write(`<g:service>Standard</g:service>\n`);
        writeStream.write(`<g:price>${product?.standardShipping?.price}GBP</g:price>\n`);
        writeStream.write(`</g:shipping>\n`);
        writeStream.write('</item>\n');
      }

      // Process the current batch of products here
      skip += batchSize;
      logger.info(`BATCH ${skip}`)
    }
    writeStream.write('</channel>\n');
    writeStream.write('</rss>\n');




    res.status(200).send('done');
  });
});

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;