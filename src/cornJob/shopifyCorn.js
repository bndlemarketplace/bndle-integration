const Shopify = require('shopify-api-node');
const axios = require('axios');
const httpStatus = require('http-status');
const logger = require('../config/logger');
const ApiError = require('../utils/ApiError');
const constVer = require('../config/constant');
const User = require('../models/user.model');
const { Product, ProductVariants, Mapping, Category } = require('../models');
const restifyConfig = require('../config/restifyConfig');
const LoggerService = require('../services/logger.service');
const { s3Url } = require('../config/restifyConfig');
const s3upload = require('../utils/s3-bucket');
const { Console } = require('winston/lib/winston/transports');
const VendorOrder = require('../models/vendorOrder.model');
const emailService = require('../services/emailService');
const Order = require('../models/order.model');
const product = require('../models/product.model');
const platformServiceFactory = require('../services/fulfilmentPlatformServiceFactory');
const { registerAllWebhooksService } = require('../services/vendor/vendorService');
const { AddJobPublishProductToShopify2 } = require('../lib/jobs/queue/addToQueue');

const locationId = restifyConfig.locationId;

const client = new Shopify(restifyConfig.shopifyConfig);

// intigration
const mapOptionWithBndle = async (options, subCat, vendorId) => {
  let subCategory = subCat;
  const subcatArray = ['Maternity', 'Shoes'];
  if (!subcatArray.includes(subCategory)) {
    subCategory = 'Others';
  }
  let mapStatus = true;
  let mapAllVariant = true;
  let canMap = true;
  const mappedOption = [];
  let vendorOptionMapping = await Mapping.findOne({ vendorId: vendorId });
  // console.log()
  // console.log(vendorOptionMapping);
  vendorOptionMapping = vendorOptionMapping?.optionMapping;

  for (let optionIndex = 0; optionIndex < options.length; optionIndex++) {
    const option = options[optionIndex];
    if (option.name === 'Size' || option.name === 'Age') {
      const vendorOptionIndex = vendorOptionMapping.findIndex((vendorOption) => {
        // console.log(vendorOption.vendorOptionName, option.name);
        // console.log(vendorOption.subCategory, subCategory);
        return vendorOption.vendorOptionName === option.name && vendorOption.subCategory === subCategory;
      });

      if (vendorOptionIndex == -1) {
        mapStatus = false;
        canMap = false;
      } else {
        optionObj = {};
        optionObj.values = [];
        optionObj.name = vendorOptionMapping[vendorOptionIndex].bundleOptionName;
        // console.log(vendorOptionMapping);
        // console.log(vendorOptionIndex, '======================');

        await option.values.forEach((value) => {
          const vendorValue = value;
          const bndleValue = vendorOptionMapping[vendorOptionIndex].valueMapping[vendorValue];
          if (bndleValue === undefined) {
            mapAllVariant = false;
          } else {
            optionObj.values.push(bndleValue);
          }
        });
        mappedOption.push(optionObj);
      }
    } else {
      optionObj = {};
      optionObj.values = [];
      optionObj.name = option.name;
      await option.values.forEach((value) => {
        optionObj.values.push(value);
      });
      mappedOption.push(optionObj);
    }
  }
  return { canMap, mappedOption };
};

const mapWeightUnit = (unit) => { // map units of shopify
  switch (unit) {
    case 'GRAMS': return 'g';
    case 'GRAM': return 'g';
    case 'KILOGRAMS': return 'kg';
    case 'KILOGRAM': return 'kg';
    case 'OUNCES': return 'oz';
    case 'OUNCE': return 'oz';
    case 'POUNDS': return 'lb';
    case 'POUND': return 'lb';
    default: return '';
  }
}

const mapWithBndleVariant = async (options, subCat, vendorId, vendorOptionMapping) => {
  let subCategory = subCat;
  // console.log('===options, subCat, vendorOptionMapping==', options, subCat, vendorOptionMapping);
  const subcatArray = ['Maternity', 'Shoes'];
  if (!subcatArray.includes(subCategory)) {
    subCategory = 'Others';
  }
  let mapStatus = true;
  let mappedOption = [];
  // let vendorOptionMapping = await Mapping.findOne({ vendorId: vendorId });
  vendorOptionMapping = vendorOptionMapping.optionMapping;

  for (let index = 0; index < options.length; index++) {
    const option = options[index];
    if (option.name === 'Size' || option.name === 'Age') {
      const vendorOptionIndex = vendorOptionMapping.findIndex((vendorOption) => {
        // console.log(vendorOption.vendorOptionName, option.name);
        // console.log(vendorOption.subCategory, subCategory);
        return vendorOption.vendorOptionName === option.name && vendorOption.subCategory === subCategory;
      });
      // console.log('vendorOptionIndex', vendorOptionIndex);
      if (vendorOptionIndex === -1) {
        mapStatus = false;
      } else {
        const optionObj = {};
        optionObj.name = vendorOptionMapping[vendorOptionIndex].bundleOptionName;
        const bndleValue = vendorOptionMapping[vendorOptionIndex].valueMapping[option.value];
        if (bndleValue === undefined) {
          mapStatus = false;
        }
        optionObj.value = bndleValue;
        mappedOption.push(optionObj);
      }
    } else {
      // const optionObj = {};
      // optionObj.name = vendorOptionMapping[vendorOptionIndex].valueMapping[option.name];
      // const bndleValue = vendorOptionMapping[vendorOptionIndex].valueMapping[option.value];
      // if (bndleValue === undefined) {
      //   mapStatus = false;
      // }
      // optionObj.value = bndleValue;
      // mappedOption.push(optionObj);
      // mappedOption = options;
      // mappedOption = JSON.parse(JSON.stringify(options));
      mappedOption.push(option);
    }
  }
  return { mapStatus, mappedOption };
};

const initialProductSync = async (userId) => {
  try {
    const userData = await User.findById(userId);
    // if (userData.autoProductSynced === true) {
    //   throw new ApiError(httpStatus.BAD_REQUEST, 'already product synced');
    // }
    // for map image data to fit in our db

    // if (userData.connectionType !== 'shopify') {
    //   throw new ApiError(403, 'user connection type is not shopify');
    // }
    registerAllWebhooksService(userId);
    const tmpClient = new Shopify({
      shopName: userData.credentials.shopName,
      accessToken: userData.credentials.accessToken,
      apiVersion: '2022-10',
    });
    (async () => {
      let params = { limit: 10 };
      do {
        const products = await tmpClient.product.list(params);
        products.forEach(async (product) => {
          const mappedImages = [];
          if (product.images.length > 0) {
            await product.images.forEach(async (img) => {
              if (img.variant_ids.length === 0) {
                // const Products3url = await s3upload.downloadImgAndUploadToS3(img.src);
                const imgObj = {
                  bndleImageId: img.id,
                  bndleProductId: img.product_id,
                  position: img.position,
                  productPlatformSrc: img.src,
                  src: img.src,
                };
                mappedImages.push(imgObj);
              }
            });
          }
          // for map option data to fit in our db
          let isDefaultVariant = false;
          let mappedOptions = await product.options.map((option) => {
            const optionObj = {
              venderProductPlatformOptionId: option.id,
              name: option.name,
              position: option.position,
              values: option.values,
            };
            return optionObj;
          });

          if (
            mappedOptions.length === 1 &&
            mappedOptions[0].name === 'Title' &&
            mappedOptions[0].values[0] == 'Default Title'
          ) {
            mappedOptions = [];
            isDefaultVariant = true;
          }

          // console.log(mappedOptions);
          const productObj = {
            venderProductPlatformId: product.id,
            productSource: constVer.model.product.productSourceEnum[1],
            title: product.title,
            description: product.body_html,
            vendorId: userId,
            vendorName: userData.name,
            productType: product.product_type,
            status: constVer.model.product.STATUS[5],
            tags: product.tags.split(', '),
            images: mappedImages,
            options: mappedOptions,
            isDeleted: false,
          };
          if (productObj.tags == '') {
            delete productObj.tags == [];
          }
          // create product
          const currentProduct = await Product.findOne({ venderProductPlatformId: productObj.venderProductPlatformId });
          let dbProduct;
          if (currentProduct === null || currentProduct.status !== 'PUBLISHED') {
            dbProduct = await Product.findOneAndUpdate(
              { venderProductPlatformId: productObj.venderProductPlatformId },
              productObj,
              {
                upsert: true,
                new: true,
              }
            );
          }
          if (dbProduct) {
            // for create variant of product
            if (product.variants.length > 0) {
              product.variants.forEach(async (variant) => {
                // map option that matches our db
                const mappedOption = [];
                await dbProduct.options.forEach((el) => {
                  if (el.values.includes(variant.option1)) {
                    mappedOption.push({ name: el.name, value: variant.option1 });
                  }
                  if (el.values.includes(variant.option2)) {
                    mappedOption.push({ name: el.name, value: variant.option2 });
                  }
                  if (el.values.includes(variant.option3)) {
                    mappedOption.push({ name: el.name, value: variant.option3 });
                  }
                });

                const mappedVariantImages = [];
                // runes for each images that includes current variant id
                await product.images.forEach(async (img) => {
                  if (img.variant_ids.includes(variant.id)) {
                    // const s3VariantUrl = await s3upload.downloadImgAndUploadToS3(img.src);
                    const imageObj = {
                      bndleImageId: img.id,
                      bndleProductId: img.product_id,
                      position: img.position,
                      variantPlatformSrc: img.src,
                      src: img.src,
                    };
                    mappedVariantImages.push(imageObj);
                  }
                });

                const variantObj = {
                  productId: dbProduct._id,
                  venderProductPlatformVariantId: variant.id,
                  price: variant.price,
                  position: variant.position,
                  options: mappedOption,
                  venderSku: variant.sku,
                  sku: variant.sku,
                  title: variant.title,
                  taxable: variant.taxable,
                  inventoryQuantity: variant.inventory_quantity,
                  openingQuantity: variant.old_inventory_quantity,
                  weight: variant.weight,
                  weightUnit: variant.weight_unit,
                  images: mappedVariantImages,
                  isDeleted: false,
                  isDefault: false,
                  isEnable: false,
                };
                if (isDefaultVariant === true) {
                  variantObj.title = product.title;
                  variantObj.isDefault = true;
                  variantObj.isEnable = true;
                }

                await ProductVariants.findOneAndUpdate({ venderProductPlatformVariantId: variant.id }, variantObj, {
                  upsert: true,
                  new: true,
                });
              });
            }
          } else {
            const loggerPayload = {
              title: 'Product sync',
              type: 'sync',
              logs: productObj,
              level: 'error',
            };
            await LoggerService.createLogger(loggerPayload);
          }
        });

        params = products.nextPageParameters;
      } while (params !== undefined);
    })().catch((err) => {
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, err.message);
    });
    await User.findByIdAndUpdate(userId, { autoProductSynced: true });
    return true;
  } catch (err) {
    console.log(err);

    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, err.message);
  }
};

const updateImagesIfNotUploaded = async (bndleProductId, dbImages) => {
  const imgArr = [];
  for (var i = 0; i < dbImages.length; i++) {
    try {
      dbImages[i].product_id = bndleProductId;
      imgArr.push(await client.productImage.create(bndleProductId, dbImages[i]));
      return imgArr;
    } catch (e) {
      logger.error(e);
    }
  }
}

// push product on status change to public
const publishProductToShopify = async (productsId) => {
  try {
    // get product by product id
    const product = await Product.find({ _id: { $in: productsId } }, { isDeleted: false });

    for (let element = 0; element < product.length; element++) {
      const el = product[element];
      const user = await User.findOne({ _id: el.vendorId });
      // map images
      const mappedImages = [];

      await el.images.forEach((image) => {
        const imgObj = {
          position: image.position,
          src: image.src,
        };
        if (!imgObj.src.includes('http')) {
          imgObj.src = `${restifyConfig.s3Url}${imgObj.src}`;
        }
        mappedImages.push(imgObj);
      });

      // map options
      const mapOptions = [];
      const mappedOptionTags = [];
      await el.options.forEach((option) => {
        if (option.values.length === 0) {
          return;
        }
        const optionObj = {
          name: option.name,
          values: option.values,
        };
        mapOptions.push(optionObj);
      });
      let mappedOptionWithBndle;
      // option mapped option with bndle TODO:
      // console.log(el.options)
      if (el.productSource !== 'direct') {
        console.log('in');
        mappedOptionWithBndle = await mapOptionWithBndle(mapOptions, el.subCategory, el.vendorId);
        // console.log(mappedOptionWithBndle);
        if (mappedOptionWithBndle.canMap === true) {
          mappedOptionWithBndle = mappedOptionWithBndle.mappedOption;
        }
      } else {
        mappedOptionWithBndle = mapOptions;
      }
      // console.log(mappedOptionWithBndle, '....................');
      mappedOptionWithBndle.forEach((option) => {
        // console.log(mappedOptionWithBndle);
        option.values.forEach((value) => {
          mappedOptionTags.push(`${option.name}_${value}`);
        });
      });

      // get variants from our db
      const variants = await ProductVariants.find({ productId: el._id, isDeleted: false });

      // map variant
      const variantArray = [];
      for (let variantIndexFor = 0; variantIndexFor < variants.length; variantIndexFor++) {
        const variant = variants[variantIndexFor];
        //variant can map or not
        let canMap;
        // console.log(2);
        if (el.productSource !== 'direct') {
          let vendorOptionMapping = await Mapping.findOne({ vendorId: el.vendorId });
          const mappedVariantOption = await mapWithBndleVariant(
            variant.options,
            el.subCategory,
            el.vendorId,
            vendorOptionMapping
          );
          variant.options = mappedVariantOption.mappedOption;
          // console.log(mappedVariantOption.mapStatus);
          canMap = mappedVariantOption.mapStatus;
          // console.log(mappedVariantOption);
        }
        // console.log(variant.options);
        const variantPrice = variant.price ? variant.price : 0;
        const option1 = variant.options[0] ? variant.options[0].value : null;
        const option2 = variant.options[1] ? variant.options[1].value : null;
        const option3 = variant.options[2] ? variant.options[2].value : null;
        const variantsObj = {
          mongoVariantId: variant._id,
          title: variant.title,
          price: variantPrice,
          sku: variant.sku,
          inventory_quantity: variant.openingQuantity,
          option1,
          option2,
          option3,
          weight: variant.weight,
          weight_unit: mapWeightUnit(variant.weightUnit),
          inventory_management: 'shopify',
        };
        // console.log(el.options);
        if (variant.bndleVariantId !== undefined && variant.bndleVariantId !== '') {
          variantsObj.id = variant.bndleVariantId;
        }
        // if (variant.images.length > 0) {
        // }
        // if (variantsObj.option1 == null && variantsObj.option2 == null && variantsObj.option3 == null) {
        //   if (el.options.length > 1 || el.options[0].values.length > 1) {
        //     // continue;
        //     console.log('inside? --------------------------');
        //   }
        // }

        // at update time we delete options
        // if (variant.bndleVariantId !== '') {
        //   variantsObj.id = variant.bndleVariantId;
        // delete variantsObj.option1;
        // delete variantsObj.option2;
        // delete variantsObj.option3;
        // }
        if (el.productSource !== 'direct' && variant.isEnable === true) {
          if (canMap === true) {
            variantArray.push(variantsObj);
          }
        }
        if (el.productSource === 'direct' && variant.isEnable === true) {
          variantArray.push(variantsObj);
        }
      }
      // temp default values
      const category = el.category; // ? el.category : 'Maternity';
      const subCategory = el.subCategory; //? el.subCategory : 'Clothes';
      const productType = el.productCategory; // ? el.productCategory : 'Dresses';
      const lifeStage = el.lifeStage; // ? el.lifeStage : 'Newborn';
      // console.log(3);

        // console.log("====category==",category,productType)
        await Category.updateOne(
          { 'secondaryCategories.tertiaryCategories.tertiaryCategory': el.productCategory },
          { $inc: { 'secondaryCategories.$[y].tertiaryCategories.$[xxx].count': 1 } },
          { arrayFilters: [
            { 'y.secondaryCategory': el.subCategory },
            { 'xxx.tertiaryCategory': el.productCategory },
          ]
        }
        );
        const categoryData = await Category.aggregate([
          {
            $unwind: '$secondaryCategories',
          },
          {
            $match: {
              primaryCategory: el.category,
              'secondaryCategories.secondaryCategory': el.subCategory,
            },
          },
          {
            $project: {
              data: '$secondaryCategories',
            },
          },
          {
            $unwind: '$data',
          },
        ]);
        const isExist = categoryData[0].data.tertiaryCategories.some((t) => t.count > 0);
        if (isExist) {
          await Category.updateOne(
            {
              secondaryCategories: { $exists: true },
              'secondaryCategories.secondaryCategory': el.subCategory,
              'secondaryCategories.tertiaryCategories.tertiaryCategory': el.productCategory,
            },
            {
              $set: { 'secondaryCategories.$[xxx].count': 1 },
            },
            { arrayFilters: [{ 'xxx.secondaryCategory': el.subCategory }] }
          );
        } else {
          await Category.updateOne(
            {
              secondaryCategories: { $exists: true },
              'secondaryCategories.secondaryCategory': el.subCategory,
              'secondaryCategories.tertiaryCategories.tertiaryCategory': el.productCategory,
            },
            {
              $set: { 'secondaryCategories.$[xxx].count': 0 },
            },
            { arrayFilters: [{ 'xxx.secondaryCategory': el.subCategory }] }
          );
        }
      const productObj = {
        title: `${el.title}`,
        body_html: el.description,
        vendor: user.name,
        product_type: productType,
        status: 'active',
        tags: [
          ...el.tags,
          ...mappedOptionTags,
          ...el.specialTags,
          category,
          subCategory,
          `LifeStage_${lifeStage}`,
          productType,
        ],
        variants: variantArray,
        options: mappedOptionWithBndle,
        images: mappedImages,
        metafields: [
          {
            key: 'life_stage',
            value: lifeStage,
            type: 'single_line_text_field',
            namespace: 'custom',
          },
          {
            key: 'productId',
            value: el._id,
            type: 'single_line_text_field',
            namespace: 'custom',
          },
          {
            key: 'vendorId',
            value: user._id,
            type: 'single_line_text_field',
            namespace: 'custom',
          },
          {
            key: 'region',
            value: user.bankDetails[0] && user.bankDetails[0].region,
            type: 'single_line_text_field',
            namespace: 'custom',
          },
        ],
      };
      console.log(productObj.tags);
      if (el.vendorName === undefined || el.vendorName === '') {
        if (user.brandName == '') {
          productObj.vendor = user.name;
        } else {
          productObj.vendor == user.brandName;
        }
      }
      if (el.bndleId !== '') {
        productObj.id = el.bndleId;
      }
      // console.log(4);
      // console.log(JSON.stringify(productObj));

      let bndleProduct;
      // if product is already pushed to bndle store
      // console.log(JSON.stringify(productObj));
      if (el.bndleId !== '') {
        console.log(' // if product is already pushed to bndle store');
        // if (productObj.options.length === 0) {
        // }
        if (productObj.options.length === 0) {
          delete productObj.options;
        }
        // on update option need to be removed
        let updateProductObj = JSON.parse(JSON.stringify(productObj));
        updateProductObj.variants.forEach((variants) => {
          console.log('in 1 ');
          if (variants.id !== undefined && variants.id !== '') {
            console.log('in 2 ');
            delete variants.option1;
            delete variants.option2;
            delete variants.option3;
          }
        });
        delete updateProductObj.metafields;
        const product = { product: productObj };
        console.log(JSON.stringify(updateProductObj), '****************/////////////////**********************');
        // console.log(JSON.stringify(updateProductObj));
        client.product
          .update(el.bndleId, updateProductObj)
          .then(async (bndleProduct) => {
            // console.log(JSON.stringify(bndleProduct));
            // console.log(5);
            logger.info(`${bndleProduct.title} product updated`);

            if(bndleProduct && bndleProduct.images.length !== mappedImages.length) {
              logger.info('patch called - start to upload images in shopify');
              bndleProduct.images = await updateImagesIfNotUploaded(bndleProduct.id, mappedImages) //patch - sometimes the images are not uploaded in shopify
            }

            const updatedProduct = await Product.findOneAndUpdate({ _id: el._id }, { bndleId: bndleProduct.id });
            await client.productListing.create(bndleProduct.id, { product_listing: { product_id: bndleProduct.id } });
            await bndleProduct.variants.forEach(async (bndleVariant) => {
              if (bndleProduct.variants.length === 1) {
                await ProductVariants.updateOne({ _id: variants[0]._id }, { bndleVariantId: bndleVariant.id });
              }
              await productObj.variants.forEach(async (mongoVariant) => {
                // for set value in default variant
                if (productObj.variants.length === 1) {
                  const variantQty = await ProductVariants.findOneAndUpdate(
                    { _id: mongoVariant.mongoVariantId },
                    { bndleVariantId: bndleVariant.id, bndleInventoryItemId: bndleVariant.inventory_item_id },
                    { new: true }
                  );

                  await client.inventoryLevel.set({
                    location_id: locationId,
                    inventory_item_id: variantQty.bndleInventoryItemId,
                    available: variantQty.openingQuantity,
                  });
                }
                // bndleVariant.title;
                // if (el.productSource !== 'direct') {
                // console.log(bndleVariant.option1 === mongoVariant.option1);
                // console.log(bndleVariant.option1, '===', mongoVariant.option1);
                // console.log(bndleVariant.option2 === mongoVariant.option2);
                // console.log(bndleVariant.option2, '===', mongoVariant.option2);
                // console.log(bndleVariant.option3 === mongoVariant.option3);
                // console.log(bndleVariant.option3, '===', mongoVariant.option3);
                if (
                  bndleVariant.option1 === mongoVariant.option1 &&
                  bndleVariant.option2 === mongoVariant.option2 &&
                  bndleVariant.option3 === mongoVariant.option3
                ) {
                  console.log('inside !directProduct');
                  const variantQty = await ProductVariants.findOneAndUpdate(
                    { _id: mongoVariant.mongoVariantId },
                    { bndleVariantId: bndleVariant.id, bndleInventoryItemId: bndleVariant.inventory_item_id },
                    { new: true }
                  );
                  if (variantQty.images.length > 0) {
                    let src = variantQty.images[0].src;
                    if (!src.includes('http')) {
                      src = `${restifyConfig.s3Url}${src}`;
                    }
                    await client.productImage.create(updatedProduct.bndleId, {
                      variant_ids: [variantQty.bndleVariantId],
                      src: src,
                    });
                  }

                  const lol = await client.inventoryLevel.set({
                    location_id: locationId,
                    inventory_item_id: variantQty.bndleInventoryItemId,
                    available: variantQty.openingQuantity,
                  });
                }
                // }
              });
            });
          })
          .catch(async (err) => {
            console.log(err);
            const loggerPayload = {
              title: 'Product publish',
              type: 'publish',
              logs: err.message,
              level: 'error',
            };
            await LoggerService.createLogger(loggerPayload);
          });
      } else {
        console.log(' // if product is already pushed to bndle store if not ..................');
        const product = { product: productObj };
        // console.log(JSON.stringify(product), '****************/////////////////**********************');

        client.product
          .create(productObj)
          .then(async (bndleProduct) => {
            // code for image
            // console.log('0000000000000000000000000000');
            // console.log(JSON.stringify(bndleProduct));
            // console.log(6);
            logger.info(`${bndleProduct.title} product created`);
            // console.log(bndleProduct.id);
            // console.log({ product_listing: { product_id: bndleProduct.id } });
            if(bndleProduct && bndleProduct.images.length !== mappedImages.length) {
              logger.info('patch called - start to upload images in shopify');
              bndleProduct.images = await updateImagesIfNotUploaded(bndleProduct.id, mappedImages) //patch - sometimes the images are not uploaded in shopify
            }
            
            const updatedProduct = await Product.findOneAndUpdate(
              { _id: el._id },
              { bndleId: bndleProduct.id },
              { new: true }
            );
            await client.productListing.create(bndleProduct.id, { product_listing: { product_id: bndleProduct.id } });
            // console.log(7);
            await bndleProduct.variants.forEach(async (bndleVariant) => {
              // console.log(bndleProduct.variants.length, 'this is lenth');
              if (bndleProduct.variants.length === 1) {
                await ProductVariants.updateOne({ _id: variants[0]._id }, { bndleVariantId: bndleVariant.id });
              }
              await productObj.variants.forEach(async (mongoVariant) => {
                // console.log(mongoVariant);
                // if (el.productSource == 'direct') {
                //   if (bndleVariant.title.split(' ').join('') === mongoVariant.title) {
                //     await ProductVariants.findOneUpdate(
                //       { _id: mongoVariant.mongoVariantId },
                //       { bndleVariantId: bndleVariant.id, bndleInventoryItemId: bndleVariant.inventory_item_id },
                //       { new: true }
                //     );
                //   }
                // }
                // console.log(bndleVariant.title, '===', mongoVariant.title);
                // if (el.productSource !== 'direct') {
                if (
                  bndleVariant.option1 === mongoVariant.option1 &&
                  bndleVariant.option2 === mongoVariant.option2 &&
                  bndleVariant.option3 === mongoVariant.option3
                ) {
                  updatedVariant = await ProductVariants.findOneAndUpdate(
                    { _id: mongoVariant.mongoVariantId },
                    { bndleVariantId: bndleVariant.id, bndleInventoryItemId: bndleVariant.inventory_item_id },
                    { new: true }
                  );
                  if (updatedVariant.images.length > 0) {
                    let src = updatedVariant.images[0].src;
                    if (!src.includes('http')) {
                      src = `${restifyConfig.s3Url}${src}`;
                    }
                    await client.productImage.create(updatedProduct.bndleId, {
                      variant_ids: [updatedVariant.bndleVariantId],
                      src: src,
                    });
                  }
                }
                // }
              });
            });
          })
          .catch(async (err) => {
            console.log(err);
            const loggerPayload = {
              title: 'Product publish',
              type: 'publish',
              logs: productObj,
              level: 'error',
            };
            await LoggerService.createLogger(loggerPayload);
          });
      }
    }
    return true;
  } catch (err) {
    console.log(err);
  }
};

const unpublishProductFromShopify = async (productsId) => {
  try {
    // get product by product id
    const products = await Product.find({ _id: { $in: productsId } }, { isDeleted: false });

    for (let productIndex = 0; productIndex < products.length; productIndex++) {
      const product = products[productIndex];

      if (product.category !== 'Support') {
        const categoryData = await Category.aggregate([
          {
            $unwind: '$secondaryCategories',
          },
          {
            $match: {
              'secondaryCategories.secondaryCategory': product.subCategory,
            },
          },
          {
            $project: {
              data: '$secondaryCategories.tertiaryCategories',
            },
          },
          {
            $unwind: '$data',
          },
          {
            $match: {
              'data.tertiaryCategory': product.productCategory,
            },
          },
        ]);
        if (categoryData[0].data.count > 0) {
          const count = await Product.countDocuments({
            productCategory: product.productCategory,
            status: 'PUBLISHED',
            isDeleted: false,
          });
          await Category.findOneAndUpdate(
            {
              secondaryCategories: { $exists: true },
              primaryCategory: product.category,
              'secondaryCategories.tertiaryCategories.count': { $gt: 0 },
              'secondaryCategories.tertiaryCategories.tertiaryCategory': product.productCategory,
            },
            { $set: { 'secondaryCategories.$[].tertiaryCategories.$[xxx].count': count } },
            { arrayFilters: [{ 'xxx.tertiaryCategory': product.productCategory }] }
          );
        }
        const secondaryCatData = await Category.aggregate([
          {
            $unwind: '$secondaryCategories',
          },
          {
            $match: {
              primaryCategory: product.category,
              'secondaryCategories.secondaryCategory': product.subCategory,
            },
          },
          {
            $project: {
              data: '$secondaryCategories',
            },
          },
          {
            $unwind: '$data',
          },
        ]);
        const isExist = secondaryCatData[0].data.tertiaryCategories.some((t) => t.count > 0);
        console.log("==isExist===",isExist)
        if (isExist) {
          await Category.updateOne(
            {
              secondaryCategories: { $exists: true },
              'secondaryCategories.secondaryCategory': product.subCategory,
              'secondaryCategories.tertiaryCategories.tertiaryCategory': product.productCategory,
            },
            {
              $set: { 'secondaryCategories.$[xxx].count': 1 },
            },
            { arrayFilters: [{ 'xxx.secondaryCategory': product.subCategory }] }
          );
        } else {
          await Category.updateOne(
            {
              secondaryCategories: { $exists: true },
              'secondaryCategories.secondaryCategory': product.subCategory,
              'secondaryCategories.tertiaryCategories.tertiaryCategory': product.productCategory,
            },
            {
              $set: { 'secondaryCategories.$[xxx].count': 0 },
            },
            { arrayFilters: [{ 'xxx.secondaryCategory': product.subCategory }] }
          );
        }
      } else {
        secondaryCatData = await Category.aggregate([
          {
            $unwind: '$secondaryCategories',
          },
          {
            $match: {
              'secondaryCategories.secondaryCategory': product.subCategory,
            },
          },
        ]);
        const count = await Product.countDocuments({ subCategory: product.subCategory, status: 'PUBLISHED', isDeleted: false });
        if (secondaryCatData[0].secondaryCategories.count > 0) {
          await Category.updateOne(
            {
              secondaryCategories: { $exists: true },
              primaryCategory: product.category,
              'secondaryCategories.secondaryCategory': product.subCategory,
            },
            { $set: { 'secondaryCategories.$[xxx].count': count } },
            { arrayFilters: [{ 'xxx.secondaryCategory': product.subCategory }] }
          );
        }
      }

      if (product.bndleId !== '') {
        const productObj = { status: 'draft' };
        bndleProduct = await client.product.update(product.bndleId, productObj);
      }
    }
    return true;
  } catch (err) {
    console.log(err);
  }
};

// push product to shopify from our database
const pushProductToShopify = async () => {
  const response = true;
  const limit = 1;
  let page = 0;
  const count = await Product.find({ bndleShopifyId: null }).count();
  let tmpproduct;
  // for (let i = 0; i < 1; i++) {
  for (let i = 0; i < count / limit; i++) {
    const product = await Product.find({ bndleShopifyId: null })
      .skip(page * limit)
      .limit(limit);
    page++;
    tmpproduct = product;

    for (let peoductIndex = 0; peoductIndex < array.length; peoductIndex++) {
      const el = array[peoductIndex];

      // map images
      const mappedImages = [];

      await el.images.forEach((image) => {
        const imgObj = {
          position: image.position,
          src: image.src,
        };
        mappedImages.push(imgObj);
      });

      // map options
      const mapOptions = [];
      await el.options.forEach((option) => {
        const optionObj = {
          name: option.name,
          values: option.values,
        };
        mapOptions.push(optionObj);
      });

      // get variants from our db
      const variants = await ProductVariants.find({ productId: el._id });

      // map variant
      const variantArray = [];
      for (let variantIndex = 0; variantIndex < variants.length; variantIndex++) {
        const variant = variants[variantIndex];

        const option1 = variant.options[0] ? variant.options[0].value : null;
        const option2 = variant.options[1] ? variant.options[1].value : null;
        const option3 = variant.options[2] ? variant.options[2].value : null;
        const variantsObj = {
          title: variant.title,
          price: variant.price,
          sku: variant.sku,
          option1,
          option2,
          option3,
          weight: variant.weight,
          weight_unit: mapWeightUnit(variant.weightUnit),
        };
        variantArray.push(variantsObj);
      }
      // temp default values
      const category = el.category; //? el.category : 'Maternity';
      const subCategory = el.subCategory; //? el.subCategory : 'Clothes';
      const productType = el.productType; //? el.productType : 'Dresses';
      const lifeStage = el.lifeStage; //? el.lifeStage : 'Newborn';
      const productObj = {
        title: `${el.title}`,
        body_html: el.description,
        vendor: el.vendorName,
        product_type: productType,
        tags: [...el.tags, category, subCategory],
        variants: variantArray,
        options: mapOptions,
        // images: mappedImages,
        metafields: [
          {
            key: 'life_stage',
            value: lifeStage,
            type: 'single_line_text_field',
            namespace: 'custom',
          },
        ],
      };
      await client.product.create(productObj);
    }
  }

  return tmpproduct;
};

const createUpdateProduct = async (product, mode, userId) => {
  try {
    const userData = await User.findOne({ _id: userId });
    // const currentDbProduct = await Product.findOne({ venderProductPlatformId: product.id });
    // for map image data to fit in our db
    const mappedImages = [];
    if (product.images.length > 0) {
      await product.images.forEach(async (img) => {
        if (img.variant_ids.length === 0) {
          // const Products3url = await s3upload.downloadImgAndUploadToS3(img.src);
          const imgObj = {
            bndleImageId: img.id,
            bndleProductId: img.product_id,
            position: img.position,
            productPlatformSrc: img.src,
            src: img.src,
          };
          mappedImages.push(imgObj);
        }
      });
    }
    // for map option data to fit in our db
    let isDefaultVariant = false;
    let mappedOptions = await product.options.map((option) => {
      const optionObj = {
        venderProductPlatformOptionId: option.id,
        name: option.name,
        position: option.position,
        values: option.values,
      };
      return optionObj;
    });

    if (mappedOptions.length === 1 && mappedOptions[0].name === 'Title' && mappedOptions[0].values[0] == 'Default Title') {
      mappedOptions = [];
      isDefaultVariant = true;
    }

    // console.log(mappedOptions);
    const productObj = {
      venderProductPlatformId: product.id,
      productSource: constVer.model.product.productSourceEnum[1],
      title: product.title,
      description: product.body_html,
      vendorId: userId,
      vendorName: userData.name,
      productType: product.product_type,
      status: constVer.model.product.STATUS[5],
      tags: product.tags.split(', '),
      images: mappedImages,
      options: mappedOptions,
      // isDeleted: false, // for deleted product stay deleted
    };
    if (productObj.tags == '') {
      delete productObj.tags == [];
    }
    if (mode === 'update') {
      delete productObj.status;
    }
    // create product
    let dbProduct;
    if (mode === 'create') {
      dbProduct = await Product.findOneAndUpdate(
        { venderProductPlatformId: productObj.venderProductPlatformId },
        productObj,
        {
          upsert: true,
          new: true,
        }
      );
    }
    if (mode === 'update') {
      dbProduct = await Product.findOneAndUpdate(
        { venderProductPlatformId: productObj.venderProductPlatformId },
        { images: productObj.images }
        // { upsert: true, new: true } // if by any chance we miss create webhook
      );
    }
    if (dbProduct) {
      console.log("db product id", dbProduct._id);
      // for create variant of product
      if (product.variants.length > 0) {
        product.variants.forEach(async (variant) => {
          // map option that matches our db
          const mappedOption = [];
          await dbProduct.options.forEach((el) => {
            if (el.values.includes(variant.option1)) {
              mappedOption.push({ name: el.name, value: variant.option1 });
            }
            if (el.values.includes(variant.option2)) {
              mappedOption.push({ name: el.name, value: variant.option2 });
            }
            if (el.values.includes(variant.option3)) {
              mappedOption.push({ name: el.name, value: variant.option3 });
            }
          });

          const mappedVariantImages = [];
          // runes for each images that includes current variant id
          await product.images.forEach(async (img) => {
            if (img.variant_ids.includes(variant.id)) {
              // const s3VariantUrl = await s3upload.downloadImgAndUploadToS3(img.src);
              const imageObj = {
                bndleImageId: img.id,
                bndleProductId: img.product_id,
                position: img.position,
                variantPlatformSrc: img.src,
                src: img.src,
              };
              mappedVariantImages.push(imageObj);
            }
          });

          let variantObj;
          if (mode === 'create') {
            variantObj = {
              productId: dbProduct._id,
              venderProductPlatformVariantId: variant.id,
              price: variant.price,
              position: variant.position,
              options: mappedOption,
              venderSku: variant.sku,
              sku: variant.sku,
              title: variant.title,
              taxable: variant.taxable,
              inventoryQuantity: variant.inventory_quantity,
              openingQuantity: variant.old_inventory_quantity,
              weight: variant.weight,
              weightUnit: mapWeightUnit(variant.weight_unit),
              images: mappedVariantImages,
              isDeleted: false,
              isDefault: false,
              isEnable: false,
            };
            if (isDefaultVariant === true) {
              variantObj.title = product.title;
              variantObj.isDefault = true;
              variantObj.isEnable = true;
            }
          }

          if (mode === 'update') {
            variantObj = {
              // productId: dbProduct._id,
              // venderProductPlatformVariantId: variant.id,
              price: variant.price,
              // position: variant.position,
              // options: mappedOption,
              // venderSku: variant.sku,
              // sku: variant.sku,
              // title: variant.title,
              // taxable: variant.taxable,
              inventoryQuantity: variant.inventory_quantity,
              openingQuantity: variant.old_inventory_quantity,
              // weight: variant.weight,
              // weightUnit: variant.weight_unit,
              images: mappedVariantImages,
              // isDeleted: false,
              // isDefault: false,
              // isEnable: false,
            };
            // if (isDefaultVariant === true) {
            //   variantObj.title = product.title;
            //   variantObj.isDefault = true;
            //   variantObj.isEnable = true;
            // }
          }

          await ProductVariants.findOneAndUpdate({ venderProductPlatformVariantId: variant.id }, variantObj, {
            upsert: true,
            new: true,
          });
        });
      }
    } else {
      const loggerPayload = {
        title: 'Product sync',
        type: 'sync',
        logs: productObj,
        level: 'error',
      };
      await LoggerService.createLogger(loggerPayload);
    }
    if (dbProduct && dbProduct.status === 'PUBLISHED') {
        AddJobPublishProductToShopify2(dbProduct._id);
      // publishProductToShopify(dbProduct._id);
    }
  } catch (err) {
    console.log(err);
  }
};

const updateOrderStatus = async (order, id) => {
  let logs = [];
  try {
    console.log(JSON.stringify(order));
    logs.push({ S: `Step 1: Webhook Received with payload ${JSON.stringify(order)}` })
    const platform = platformServiceFactory();
    // get product by product id
    let status;
    let currentStatus;
    let products = await VendorOrder.findOne({ venderPlatformOrderId: order.id });
    if (products === null) {
      logs.push({ E: `Step 2: venderPlatformOrderId not found` })
      logService.insertLog(order.id, {
        webHookData: order,
        logType : 'ORDER_UPDATE_WEBHOOK',
        status : 'ERROR',
      }, logs);
      return true;
    }

    logs.push({ S: `Step 2: venderPlatformOrderId found with status ${products.status}` })
    status = products.status;
    currentStatus = products.status;
    products = JSON.parse(JSON.stringify(products));

    // client for get fulfillment status of that user
    const userData = await User.findById(id);
    logs.push({ S: `Step 3: User Data found ${JSON.stringify(userData)}` })
    // const yolo =
    // console.log(order.id, '----------------');
    const data = await platform.webhooks.fulfillments(userData, order.id);

    console.log("updateOrderStatus data:", data);
    if (data[0].status === 'on_hold') {
      console.log('inside on hold');
      status = constVer.model.order.vendorOrderStatus.ON_HOLD;
    }
    // console.log(products);
    // console.log(status, '+++++++++++++++++++++++++++');

    if (order.fulfillment_status === 'fulfilled') {
      // console.log('inside +++++++++++++++++++++++');
      status = constVer.model.order.vendorOrderStatus.SHIPPED;
      products.trackingId = order.fulfillments[0].tracking_number;
      products.carrier = order.fulfillments[0].tracking_company;
      products.trackingUrl = order.fulfillments[0].tracking_url;
      products.shippingDate = order.fulfillments[0].updated_at;

      logs.push({ S: `Step 4: Webhook received with fulfilled status` })
    }
    if (order.fulfillment_status === 'partial') {
      status = constVer.model.order.vendorOrderStatus.PARTIALLY_SHIPPED;
      logs.push({ S: `Step 4: Webhook received with partial status` })
    }

    // if order cenacle
    if (order.cancelled_at !== null && products.cancelAt !== null) {
      const cancelReason = order.cancel_reason;
      status = constVer.model.order.vendorOrderStatus.REQUEST_DECLINED;
      products.venderPlatformOrderId = order.id;
      products.cancelReason = cancelReason;
      products.status = status;
      products.cancelAt = order.cancelled_at;
    }
    products.status = status;
    if (order.refunds.length !== 0) {
      // && products.cancelAt === null
      const tmpVariantIdArray = [];
      for (let refundIndex = 0; refundIndex < order.refunds.length; refundIndex++) {
        const refundItem = order.refunds[refundIndex];
        for (let lineItemIndex = 0; lineItemIndex < refundItem.refund_line_items.length; lineItemIndex++) {
          const lineItem = refundItem.refund_line_items[lineItemIndex];
          returnProductIndex = products.returnItems.findIndex(async (item) => {
            return (
              toString(item.vendorProductId) === toString(lineItem.line_item.product_id) &&
              toString(item.vendorVariantId) === toString(lineItem.line_item.variant_id)
            );
          });
          if (
            !tmpVariantIdArray.includes(lineItem.line_item.variant_id) &&
            products.returnItems.length !== 0 &&
            returnProductIndex !== -1
          ) {
            products.returnItems[returnProductIndex].receivedQuantity = 0;
            tmpVariantIdArray.push(lineItem.line_item.variant_id);
          }
          if (returnProductIndex !== -1) {
            products.returnItems[returnProductIndex].receivedQuantity += lineItem.quantity;
          }
        }
      }
    }

    const statusHistoryObj = {
      status: products.status,
      date: new Date(),
    };
    if (products.status !== currentStatus) {
      products.statusHistory.push(statusHistoryObj);
    }

    logs.push({ S: `Step 5: VendorOrder update with ${JSON.stringify(products)}` })
    const vendorOrderData = await VendorOrder.findOneAndUpdate({ venderPlatformOrderId: order.id }, products, {
      new: true,
    });
    // console.log('++++++++++++++++++++++++');
    console.log("vendorOrderData :",vendorOrderData);
    if (products.status !== currentStatus) {
      await updateMainOrderStatus(vendorOrderData);
    }

    if (order.fulfillment_status === 'fulfilled') {
      const orderData = await VendorOrder.findOne({ _id: vendorOrderData._id })
        .populate({
          path: 'vendorId',
        })
        .populate({
          path: 'customerId',
        })
        .lean();
      console.log('====shopify order====');
      // orderData
      const email = orderData.customerId.email;
      await emailService.orderShippedEmail(email, orderData, vendorOrderData.trackingId);
    }
    LoggerService.insertLog(order.id, {
      webHookData: order,
      logType : 'ORDER_UPDATE_WEBHOOK',
      status : 'SUCCESS',
    }, logs);
    return true;
  } catch (err) {
    LoggerService.insertLog(order.id, {
      webHookData: order,
      logType : 'ORDER_UPDATE_WEBHOOK',
      status : `ERROR ${JSON.stringify(err)}`,
    }, logs);
    console.log(err);
  }
};

const finalStatusFn = (statusArray, currentOrderStatus) => {
  let isAllStatusSame = true;
  let highestPriorityStatus = '';
  for (let currentOrderStatusIndex = 0; currentOrderStatusIndex < currentOrderStatus.length; currentOrderStatusIndex++) {
    const currentStatus = currentOrderStatus[currentOrderStatusIndex];
    if (currentStatus !== currentOrderStatus[0]) {
      isAllStatusSame = false;
      break;
    }
  }

  if (isAllStatusSame) {
    return currentOrderStatus[0];
  }

  if (!isAllStatusSame) {
    for (
      let highestPriorityStatusIndex = 0;
      highestPriorityStatusIndex < currentOrderStatus.length;
      highestPriorityStatusIndex++
    ) {
      const status = currentOrderStatus[highestPriorityStatusIndex];

      if (statusArray.indexOf(highestPriorityStatus) < statusArray.indexOf(status)) {
        highestPriorityStatus = status;
      }
    }
    if (highestPriorityStatus === 'SHIPPED') {
      highestPriorityStatus = 'PARTIALLY_SHIPPED';
    } else if (highestPriorityStatus === 'REQUEST_DECLINED') {
      highestPriorityStatus = 'PARTIALLY_REQUEST_DECLINED';
    } else if (highestPriorityStatus === 'ON_HOLD') {
      highestPriorityStatus = 'PARTIALLY_ON_HOLD';
    }

    return highestPriorityStatus;
  }
};

const updateMainOrderStatus = async (vendorOrderData) => {
  const statusPriority = [
    'NEW',
    'PARTIALLY_ON_HOLD',
    'ON_HOLD',
    'PARTIALLY_REQUEST_DECLINED',
    'REQUEST_DECLINED',
    'PARTIALLY_SHIPPED',
    'SHIPPED',
    'PARTIALLY_RETURNED',
    'RETURNED',
    'PARTIALLY_REFUNDED',
    'REFUNDED',
    'PARTIALLY_RETURN_IN_PROGRESS',
    'RETURN_IN_PROGRESS',
  ];

  const mainOrder = await Order.findOne({ _id: vendorOrderData.orderId });
  // const currentOrderStatus = vendorOrderData.status;
  // let mainOrderStatus = mainOrder.status;
  const allStatusArray = [];
  const vendersOrders = await VendorOrder.find({ orderId: vendorOrderData.orderId });
  for (let orderIndex = 0; orderIndex < vendersOrders.length; orderIndex++) {
    const order = vendersOrders[orderIndex];
    allStatusArray.push(order.status);
  }
  const finalStatus = finalStatusFn(statusPriority, allStatusArray);

  const orderObj = JSON.parse(JSON.stringify(mainOrder));
  orderObj.status = finalStatus;

  const vendorIndex = await mainOrder.vendor.findIndex((vendor) => {
    return vendorOrderData.vendorId.equals(vendor.vendorId);
  });

  if (vendorOrderData.status === 'REQUEST_DECLINED') {
    orderObj.isCancel = true;
  }

  orderObj.vendor[vendorIndex] = vendorOrderData;

  const statusHistoryObj = {
    status: orderObj.status,
    date: new Date(),
  };
  orderObj.statusHistory.push(statusHistoryObj);
  // body.statusHistory = currentOrder.statusHistory;
  await Order.updateOne({ _id: vendorOrderData.orderId }, orderObj);
};

const fulfillmentUpdate = async (order) => {
  try {
    // console.log(JSON.stringify(order));
  } catch (err) {
    console.log(err);
  }
};

const deleteProductById = async (bndleId) => {
  try {
    const result = await axios({
      method: 'DELETE',
      url: `https://${restifyConfig.shopifyConfig.shopName}/admin/api/2022-07/products/${bndleId}.json`,
      headers: { 'X-Shopify-Access-Token': restifyConfig.shopifyConfig.accessToken },
    });
    return result;
  } catch (error) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'something went wrong with delete product to shopify');
  }
};

module.exports = {
  // connectToShopify,
  pushProductToShopify,
  initialProductSync,
  publishProductToShopify,
  createUpdateProduct,
  unpublishProductFromShopify,
  updateOrderStatus,
  fulfillmentUpdate,
  deleteProductById,
};
