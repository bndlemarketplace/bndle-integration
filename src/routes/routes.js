const express = require('express');
const productRoute = require('./products/productRoutes');
const config = require('../config/restifyConfig');
const webhookRoute = require('./webhooks/webhooksRoutes');
const vendorRoute = require('./vendors/vendorRoutes');
const fs = require('fs');
const {encode} = require('html-entities');

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

// test 
router.route('/check').get(async (req, res) => {
  // await updateAllVendorProducts()
  await deleteVendorProducts()
});

// router.route('/checktodos').get(((req, res) => {
//   AddJobCallTodos(req.body.id);
//   res.json('done')
// }));


router.route('/generate').get(async (req, res) => {
 
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
            vendorName : 1,
            bndleId: 1,
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
        xml += `<g:image_link>${product?.variants[0]?.images[0]?.src}</g:image_link>`;
        xml += `<g:condition>new</g:condition>`;
        xml += `<g:availability>in_stock</g:availability>`;
        xml += `<g:price>${product?.variants[0]?.price}</g:price>`;
        xml += `<g:gtin>${product.bndleId}</g:gtin>`;
        xml += `<g:brand>${product.vendorName}</g:brand>`;
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
