const express = require('express');
const productRoute = require('./products/productRoutes');
const config = require('../config/restifyConfig');
const webhookRoute = require('./webhooks/webhooksRoutes');
const vendorRoute = require('./vendors/vendorRoutes');
const fs = require('fs');
const { encode } = require('html-entities');

const { Product } = require('../models');
const { updateAllVendorProducts } = require('../services/squarespace/squarespaceService');
// const { AddJobCallTodos } = require('../lib/jobs/queue/addToQueue');

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

  const batchSize = 20;
  // Call the getProductCount function
  getProductCount().then(async count => {
    let skip = 0;
    while (skip < count) {
      let products = await Product.aggregate([
        {
          $project: {
            _id: 1,
            title: 1,
            description: 1,
            vendorName: 1,
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
          $match: {
            description: { $type: "string", $nin: ["", null] },
            bndleId: { $exists: true, $ne: "" },
            vendorName: { $type: "string", $nin: ["", null] },
            options: {
              $elemMatch: {
                name: "Color"
              }
            },
            "variants.sku": { $exists: true, $nin: ["", null] }
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


        xml += '<item>';
        xml += `<g:id>${product._id}</g:id>`;
        xml += `<g:title>${encode(product.title)}</g:title>`;
        xml += `<g:description>${encode(product.description)}</g:description>`;
        xml += `<g:link>${process.env.CUSTOMER_APP_URL}/product-detail?id=${product.bndleId}</g:link>`;
        xml += `<g:image_link>${getImage(product)}</g:image_link>`;
        xml += `<g:condition>new</g:condition>`;
        xml += `<g:availability>in_stock</g:availability>`;
        xml += `<g:price>${product?.variants[0]?.price} GBP</g:price>`;
        xml += `<g:gtin></g:gtin>`;
        xml += `<g:brand>${product.vendorName}</g:brand>`;
        xml += "<g:age_group>newborn</g:age_group>"
        xml += "<g:gender>unisex</g:gender>"
        xml += `<g:color>${(getConcatenatedColorValues(product.options))}</g:color>`
        xml += `<g:mpn>${product?.variants[0]?.sku}</g:mpn>`
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

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;