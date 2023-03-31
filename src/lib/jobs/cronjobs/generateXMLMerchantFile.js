
const { Product } = require('../../../models');
const logger = require('../../../config/logger');
const fs = require('fs');
const { encode } = require('html-entities');
module.exports = async (agenda) => {
  agenda.define('generate_xml_merchant_file', {
    concurrency: 4, lockLifetime: 1 * 60 * 1000, priority: 1,
  }, async (job) => {
    try {

      logger.info('Starting XML generation..');


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
                bndleId: { $exists: true, $ne: "" },
                vendorName: { $type: "string", $nin: ["", null] } // filter out products where vendorName is empty or null
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
        const directoryPath = path.resolve(__dirname, '../../../public/merchants/products.xml');
        logger.info(directoryPath)
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
