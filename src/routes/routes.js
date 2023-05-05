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

// test 
// router.route('/check').get(async (req, res) => {
//   // await updateAllVendorProducts()
//   await deleteVendorProducts()
// });

// router.route('/checktodos').get(((req, res) => {
//   AddJobCallTodos(req.body.id);
//   res.json('done')
// }));


router.route('/generate').get(async (req, res) => {
  function getConcatenatedColorValues(options) {

    // Filter the options array to only contain objects with name='Color'
    const colorOptions = options.filter(option => option.name === 'Color');

    // If there are no color options, return an empty string
    if (colorOptions.length === 0) {
      return '';
    }

    // Get the values of the color options and concatenate them with slashes
    const colorValues = colorOptions.map(option => option.values).flat().slice(0, 3);

    const escapedValues = colorValues.map((value) => value.replace("/", "\\/"));
    return escapedValues.join("/");

  }



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

  let xml = '<?xml version="1.0"?>';
  xml += '<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">';
  xml += '<channel>';
  xml += '<title>Example - Google Store</title>';
  xml += '<link>https://store.google.com</link>';
  xml += '<description>This is an example of a basic RSS 2.0 document containing a single item</description>';

  const batchSize = 500;
  // Call the getProductCount function
  getProductCount().then(async count => {
    let skip = 0;
    while (skip < count) {
      let products = await Product.aggregate([
        {
          $match: {
            status: 'PUBLISHED',
            isDeleted: false
          },
        },
        {
          $project: {
            _id: 1,
            title: 1,
            description: 1,
            vendorName: 1,
            vendorId: 1, // Add vendorId to the projection
            bndleId: 1,
            images: 1,
            options: 1
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
            description: 1,
            vendorName: { $arrayElemAt: ['$vendor.name', 0] },
            vendorId: 1,
            bndleId: 1,
            images: 1,
            options: 1,
            variants: 1,
            standardShipping: { $arrayElemAt: ["$vendor.standardShipping", 0] } // Add standardShipping to the projection
          }
        },
        {
          $match: {
            description: { $type: "string", $nin: ["", null] },
            bndleId: { $exists: true, $ne: "" },
            vendorName: { $type: "string", $nin: ["", null] },
            // options: {
            //   $elemMatch: {
            //     name: "Color"
            //   }
            // },
            // "variants.sku": { $exists: true, $nin: ["", null] }
          }
        },
        {
          $skip: skip
        },
        {
          $limit: batchSize
        }
      ]);




      console.log("🚀 ~ file: routes.js:165 ~ getProductCount ~ products:", products.length)
      for (let product of products) {


        xml += '<item>';
        xml += `<g:id>${product._id}</g:id>`;
        xml += `<g:title>${encode(product.title, { level: 'xml' })}</g:title>`;
        xml += `<g:description>${encode(product.description, { level: 'xml' })}</g:description>`;
        xml += `<g:link>${process.env.CUSTOMER_APP_URL}/product-detail?id=${product.bndleId}</g:link>`;
        xml += `<g:image_link>${getImage(product)}</g:image_link>`;
        xml += `<g:condition>new</g:condition>`;
        xml += `<g:availability>in_stock</g:availability>`;
        xml += `<g:price>${product?.variants[0]?.price} GBP</g:price>`;
        xml += "<g:age_group>newborn</g:age_group>"
        xml += "<g:gender>unisex</g:gender>"
        xml += `<g:color>Black/White/Grey/Green/Blue/Pink</g:color>`
        if(product?.variants[0] && product?.variants[0]?.sku) {
          xml += `<g:mpn>${(product?.variants[0] && product?.variants[0]?.sku) ? product?.variants[0]?.sku : "bndle01"}</g:mpn>`
          xml += `<g:brand>${encode(product.vendorName, { level: 'xml' })}</g:brand>`;
          xml += `<g:identifier_exists>yes</g:identifier_exists>`;
        } else {
          xml += `<g:identifier_exists>no</g:identifier_exists>`;
        }
        xml += `<g:shipping>`
        xml += `<g:country>GB</g:country>`
        xml += `<g:service>Standard</g:service>`
        xml += `<g:price>${product?.standardShipping?.price}GBP</g:price>`
        xml += `</g:shipping>`
        xml += '</item>';
      }

      // Process the current batch of products here
      skip += batchSize;
    }

    xml += '</channel>';
    xml += '</rss>';
    const path = require('path');
    const directoryPath = path.join(__dirname, '../public/merchants/products.xml');
    fs.writeFile(directoryPath, xml, (err) => {
      if (err) {
        console.error(err);
        return;
      }
      res.status(200).send('done');
    });

  });
});

router.route('/generate-facebook').get(async (req, res) => {

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

  let xml = '<?xml version="1.0"?>';
  xml += '<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">';
  xml += '<channel>';
  xml += '<title>Example - Facebook Store</title>';
  xml += '<link>https://store.google.com</link>';
  xml += '<description>This is an example of a basic RSS 2.0 document containing a single item</description>';

  const batchSize = 500;
  // Call the getProductCount function
  getProductCount().then(async count => {
    let skip = 0;
    while (skip < count) {
      let products = await Product.aggregate([
        {
          $match: {
            status: 'PUBLISHED',
            isDeleted: false
          },
        },
        {
          $project: {
            _id: 1,
            title: 1,
            description: 1,
            vendorName: 1,
            vendorId: 1, // Add vendorId to the projection
            bndleId: 1,
            images: 1,
            options: 1
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
            description: 1,
            vendorName: { $arrayElemAt: ['$vendor.name', 0] },
            vendorId: 1,
            bndleId: 1,
            images: 1,
            options: 1,
            variants: 1,
            standardShipping: { $arrayElemAt: ["$vendor.standardShipping", 0] } // Add standardShipping to the projection
          }
        },
        {
          $match: {
            description: { $type: "string", $nin: ["", null] },
            bndleId: { $exists: true, $ne: "" },
            vendorName: { $type: "string", $nin: ["", null] },
            // options: {
            //   $elemMatch: {
            //     name: "Color"
            //   }
            // },
            // "variants.sku": { $exists: true, $nin: ["", null] }
          }
        },
        {
          $skip: skip
        },
        {
          $limit: batchSize
        }
      ]);




      console.log("🚀 ~ file: routes.js:165 ~ getProductCount ~ products:", products.length)
      for (let product of products) {


        xml += '<item>';
        xml += `<g:id>${product._id}</g:id>`;
        xml += `<g:title>${encode(product.title, { level: 'xml' })}</g:title>`;
        xml += `<g:description>${encode(product.description, { level: 'xml' })}</g:description>`;
        xml += `<g:link>${process.env.CUSTOMER_APP_URL}/product-detail?id=${product.bndleId}</g:link>`;
        xml += `<g:image_link>${getImage(product)}</g:image_link>`;
        xml += `<g:brand>${encode(product.vendorName, { level: 'xml' })}</g:brand>`;
        xml += `<g:condition>new</g:condition>`;
        xml += `<g:availability>in_stock</g:availability>`;
        xml += `<g:price>${product?.variants[0]?.price} GBP</g:price>`;
        xml += `<g:shipping>`
        xml += `<g:country>GB</g:country>`
        xml += `<g:service>Standard</g:service>`
        xml += `<g:price>${product?.standardShipping?.price}GBP</g:price>`
        xml += `</g:shipping>`
        xml += '</item>';
      }

      // Process the current batch of products here
      skip += batchSize;
    }

    xml += '</channel>';
    xml += '</rss>';
    const path = require('path');
    const directoryPath = path.join(__dirname, '../public/merchants/facebook-products.xml');
    fs.writeFile(directoryPath, xml, (err) => {
      if (err) {
        console.error(err);
        return;
      }
      res.status(200).send('done');
    });

  });
});

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;