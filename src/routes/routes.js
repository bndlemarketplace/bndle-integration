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
const { calculateCategory } = require("../services/product.service");
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
              options: 1,
              productCategory: 1,
              category: 1,
              subCategory: 1
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
              productCategory: 1,
              category: 1,
              subCategory: 1,
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


        var ids = [
          "634e92ff850ab3c618561969",
          "634e935c850ab3c61856198a",
          "6372276b2e83aa93a30fe380",
          "63c1554eb4928904f21a93cd",
          "63cf9df5033f2548290f3c23",
          "633eafe984763eba86fa69e8",
          "637229e82e83aa93a30fe468",
          "634e9218850ab3c618561916",
          "634e93fb850ab3c6185619ce",
          "634ea6c8e962dcc9d68febf0",
          "6361244939b27fc38771b010",
          "637218052e83aa93a30fe032",
          "636f83552e83aa93a30fd06f",
          "63d0510493d679c8451ba59c",
          "63c154d9b4928904f21a7d54",
          "63619a95db0902c4e6230a71",
          "63d0509b93d679c8451ba578",
          "634ea8666968a4c9fac21a08",
          "63d0517793d679c8451ba5be",
          "63cf6b27033f2548290f37d5",
          "63c15554b4928904f21a9506",
          "636fc4fc2e83aa93a30fd218",
          "63cf6ced033f2548290f3802",
          "63c154d4b4928904f21a7ca3",
          "634ea4616f512cc977ed9b60",
          "6352ccc8915d30df36a02a9a",
          "636f52a22e83aa93a30fccb6",
          "637220aa2e83aa93a30fe17c",
          "63c15554b4928904f21a9500",
          "63cf6f87033f2548290f3843",
          "636d3ac749f5a9777ffaddbe",
          "63c154e3b4928904f21a7f3c",
          "63c1550ab4928904f21a8660",
          "63c154f2b4928904f21a81b5",
          "63c154d9b4928904f21a7d55",
          "63c15551b4928904f21a9463",
          "63c15560b4928904f21a9760",
          "634ec06aafc103caa94507ac",
          "63c154f5b4928904f21a8245",
          "63c15567b4928904f21a98a6",
          "63c154d4b4928904f21a7c99",
          "63612a2e39b27fc38771b44a",
          "63c1552ab4928904f21a8c08",
          "63c154d9b4928904f21a7d53",
          "636f85332e83aa93a30fd0ed",
          "63c154dcb4928904f21a7dfb",
          "635a951f915d30df36a04aaf",
          "63c9e79e033f2548290eed8d",
          "637224ac2e83aa93a30fe299",
          "63c15522b4928904f21a8aa4",
          "63619958db0902c4e62309e0",
          "637229622e83aa93a30fe408",
          "63c154e8b4928904f21a7fe6",
          "63c9b65a033f2548290eeae4",
          "634ea67ee962dcc9d68febb0",
          "63bc2858c41c29b1fd0bebfa",
          "6352c777915d30df36a029dd",
          "634ebffeafc103caa94506f3",
          "6372236c2e83aa93a30fe238",
          "63c154fcb4928904f21a8378",
          "63cfa2daac2ed6c4c696ff1b",
          "63611990fe30d3b96f663dad",
          "634e9270850ab3c61856193d",
          "634ec033afc103caa945076e",
          "6352c9c7915d30df36a02a2c",
          "636128fc39b27fc38771b311",
          "63c154e3b4928904f21a7f3a",
          "63721c7d2e83aa93a30fe0b4",
          "63c15543b4928904f21a9210",
          "634ec0f1afc103caa9450854",
          "636f58242e83aa93a30fce79",
          "63bc2855c41c29b1fd0beb29",
          "63c1550ab4928904f21a8659",
          "634ea40e6f512cc977ed9b3f",
          "63c15512b4928904f21a87b2",
          "636fc5d12e83aa93a30fd248",
          "634dc2d28fc1ffbe33ba1388",
          "63c1555cb4928904f21a96b6",
          "63cf627e033f2548290f377e",
          "63d0533693d679c8451ba633",
          "63625168de7c78d04ab7f2cd",
          "63722bca2e83aa93a30fe532",
          "63616e4edb0902c4e62303aa",
          "637229a22e83aa93a30fe42b",
          "634e8e95850ab3c6185618d1",
          "634ea615e962dcc9d68feb8d",
          "63721eb32e83aa93a30fe116",
          "63721a252e83aa93a30fe06e",
          "63c1550db4928904f21a8701",
          "636000d0b4c2feafeea2823a",
          "636146eb39b27fc38771b771",
          "634ea2ac6f512cc977ed9afb",
          "6372254d2e83aa93a30fe2c9",
          "637223b42e83aa93a30fe25d",
          "636253f8de7c78d04ab7f383",
          "634e91c7850ab3c6185618f4",
          "63c154d9b4928904f21a7d59",
          "634ea579e962dcc9d68feb4b",
          "63c15547b4928904f21a92b1",
          "634eb9c76968a4c9fac226e2",
          "637223252e83aa93a30fe21b",
          "637229222e83aa93a30fe3e9",
          "634ebb8d6f68f5ca875495c7",
          "634e8cf7850ab3c6185618a6",
          "63721c1f2e83aa93a30fe095",
          "637220fa2e83aa93a30fe19b",
          "63d0502a93d679c8451ba556",
          "635a98ad915d30df36a04b75",
          "63c15543b4928904f21a9217",
          "63ca2dfc033f2548290ef1b1",
          "636d391449f5a9777ffadd5b",
          "63c154dcb4928904f21a7e02",
          "634ea1ee850ab3c618561b5c",
          "636f56192e83aa93a30fcdd4",
          "6352c5a4915d30df36a02999",
          "634ebd58afc103caa945047b",
          "637225a62e83aa93a30fe2e6",
          "6372222f2e83aa93a30fe1f4",
          "636d387049f5a9777ffadd26",
          "634ec145afc103caa94508c8",
          "6352cf8e915d30df36a02ae2",
          "634ea3856f512cc977ed9b1e",
          "634dc6e88fc1ffbe33ba1431",
          "637221eb2e83aa93a30fe1d7",
          "6352bacf915d30df36a027f1",
          "63619004db0902c4e623073b",
          "636f53cd2e83aa93a30fccea",
          "63721e5a2e83aa93a30fe0f7",
          "63d052c193d679c8451ba5e6",
          "634ea5cbe962dcc9d68feb6c",
          "63722ae22e83aa93a30fe4cf",
          "63bc2858c41c29b1fd0bebf5",
          "63761055090cb0f85e83d5ac",
          "63c15547b4928904f21a92ab",
          "634ec0b8afc103caa9450819",
          "637221a22e83aa93a30fe1b8",
          "634e7a35850ab3c618561696",
          "6372283c2e83aa93a30fe3be",
          "634ea8016968a4c9fac219e5",
          "6360ffc8fe30d3b96f6639d0",
          "63cf765f033f2548290f3977",
          "636d37e349f5a9777ffadcd1",
          "635a99db915d30df36a04ba7",
          "634dbca4b52b2bbd55ea1b90",
          "63c154d9b4928904f21a7d5b",
          "634e7c69850ab3c61856170b",
          "637225fd2e83aa93a30fe307",
          "63c15554b4928904f21a94fe",
          "634db7aab52b2bbd55ea1ae4",
          "63722a602e83aa93a30fe491",
          "636f6f992e83aa93a30fcf7e",
          "63c154dfb4928904f21a7e9e",
          "63c15504b4928904f21a851f",
          "637224522e83aa93a30fe27a",
          "63c1552ab4928904f21a8c0a",
          "634db5ffb52b2bbd55ea1ab5",
          "634dc4208fc1ffbe33ba13b7",
          "63cf7ebd033f2548290f3af4",
          "636d39de49f5a9777ffadd91",
          "635ffd9ab4c2feafeea28214",
          "6372a3932e83aa93a30ff326",
          "634e94c2850ab3c618561a12",
          "637226d12e83aa93a30fe341",
          "63c1556ab4928904f21a9932",
          "634db929b52b2bbd55ea1b1b",
          "634ea92c6968a4c9fac21a49",
          "63c1554ab4928904f21a9341",
          "636fc69e2e83aa93a30fd2a3",
          "6372265a2e83aa93a30fe324",
          "634ebfb8afc103caa945069f",
          "634e9527850ab3c618561a35",
          "6376115c090cb0f85e83d5ee",
          "63c154dfb4928904f21a7e93",
          "637227f42e83aa93a30fe39f",
          "634ebf0cafc103caa94505ce",
          "634eb3d06968a4c9fac2260f",
          "63d04fbd93d679c8451ba521",
          "63cf8029033f2548290f3b1c",
          "63c15554b4928904f21a9504",
          "63722a9e2e83aa93a30fe4b2",
          "634dba5bb52b2bbd55ea1b4a",
          "636f84862e83aa93a30fd0cb",
          "63c1556ab4928904f21a9935",
          "63c154e3b4928904f21a7f46",
          "63722b7d2e83aa93a30fe515",
          "63c1550db4928904f21a86f9",
          "636f50412e83aa93a30fcbda",
          "63400ae58dc70aeb643ebf13",
          "63610f1bfe30d3b96f663a4d",
          "634dc0658fc1ffbe33ba1355",
          "63722b2f2e83aa93a30fe4f8",
          "634e9445850ab3c6185619ef",
          "634e767c850ab3c618561627",
          "63619888db0902c4e62309b6",
          "635bb7ad915d30df36a04dfd",
          "634ec186afc103caa9450938",
          "6372301c2e83aa93a30fe63c",
          "634dc5b48fc1ffbe33ba13e6",
          "637bf91b175b22864426d3a0",
          "634e7844850ab3c618561672",
          "636d73b449f5a9777ffae492",
          "63cf9fbc033f2548290f3ccc",
          "63c154dfb4928904f21a7e8d",
          "63721fd52e83aa93a30fe158",
          "634e93a2850ab3c6185619ab",
          "63cf743c033f2548290f394c",
          "634ebe4bafc103caa945055d",
          "63c154f2b4928904f21a81ae",
          "63c1554eb4928904f21a93d1",
          "634ea1a3850ab3c618561b3b",
          "63612ab139b27fc38771b48e",
          "634eb9896968a4c9fac2268b",
          "636504b9be8177fb3d7612ee",
          "634dbda0cada59be1f5290fb",
          "6372196a2e83aa93a30fe051",
          "635a9730915d30df36a04b47",
          "63c15515b4928904f21a8846",
        ];
        
      
      console.log("🚀 ~ file: routes.js:165 ~ getProductCount ~ products:", products.length)
      for (let product of products) {

        if(ids.indexOf(product._id.toString()) > -1) {
          console.log("id", product._id.toString(), product.title)
        }

        xml += '<item>';
        xml += `<g:id>${product._id}</g:id>`;
        xml += `<g:title>${encode(product.title, { level: 'xml' })}</g:title>`;
        xml += `<g:description>${encode(product.description, { level: 'xml' })}</g:description>`;
        xml += `<g:link>${process.env.CUSTOMER_APP_URL}/product-detail?id=${product.bndleId}</g:link>`;
        xml += `<g:image_link>${getImage(product)}</g:image_link>`;
        xml += `<g:condition>new</g:condition>`;
        xml += `<g:availability>in_stock</g:availability>`;
        xml += `<g:price>${(product && product?.variants && product?.variants.length && product?.variants[0] && product?.variants[0]?.price) ? product?.variants[0]?.price : 0} GBP</g:price>`;
        xml += "<g:age_group>newborn</g:age_group>"
        xml += "<g:gender>unisex</g:gender>"
        xml += `<g:color>Black/White/Grey/Green/Blue/Pink</g:color>`
        if(product && product?.variants && product?.variants[0] && product?.variants[0]?.sku) {
          xml += `<g:mpn>${(product?.variants[0] && product?.variants[0]?.sku) ? product?.variants[0]?.sku : "bndle01"}</g:mpn>`
          xml += `<g:brand>${encode(product.vendorName, { level: 'xml' })}</g:brand>`;
          xml += `<g:identifier_exists>yes</g:identifier_exists>`;
        } else {
          xml += `<g:identifier_exists>no</g:identifier_exists>`;
        }
        xml += `<g:product_type>${encode(product.productCategory, { level: 'xml' })}</g:product_type>`
        if(calculateCategory(product.category, product.subCategory, product.productCategory)) {
          xml += `<g:google_product_category>${calculateCategory(product.category, product.subCategory, product.productCategory)}</g:google_product_category>`
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