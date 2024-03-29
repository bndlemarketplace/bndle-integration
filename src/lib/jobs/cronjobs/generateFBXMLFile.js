
const { Product } = require('../../../models');
const logger = require('../../../config/logger');
const fs = require('fs');
const { encode } = require('html-entities');
const path = require('path');
module.exports = async (agenda) => {
  agenda.define('generate_xml_facebook_file', {
    concurrency: 4, lockLifetime: 1 * 60 * 1000, priority: 1,
  }, async (job) => {
    try {

      logger.info('Starting Facebook XML generation..');

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
      xml += '<link>https://store.facebook.com</link>';
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
        const directoryPath = path.resolve(__dirname, '../../../public/merchants/facebook-products.xml');
        fs.writeFile(directoryPath, xml, (err) => {
          if (err) {
            console.error(err);
            return;
          }
          logger.info('Done');
        });

      });


    } catch (err) {
      logger.info('XML ERROR');
    }
  });

};
