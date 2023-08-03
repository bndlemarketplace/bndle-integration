const cornServices = require('../../cornJob/shopifyCorn');
const catchAsync = require('../../utils/catchAsync');
const ApiError = require('../../utils/ApiError');
const wooCommerceService = require('../../services/woocommerce/wooCommerceService');
const wixService = require('../../services/wix/wixService');
const squarespaceService = require('../../services/squarespace/squarespaceService');
const { User, Product, Mapping, ProductVariants } = require('../../models');
const shopifyRequest = require('../../services/shopify/lib/request');
const { syncAllShopifyProducts } = require('../../services/shopify/shopifyService');
const restifyConfig = require('../../config/restifyConfig');
const algoliasearch = require('algoliasearch');
const algoliaClient = algoliasearch(process.env.ALGOLIA_APPLICATION_ID, process.env.ALGOLIA_KEY);
const index = algoliaClient.initIndex('Product');
const { syncAlgoliaProduct } = require('../../services/shopify/shopifyService');

const initialProductSyncShopify = catchAsync(async (req, res) => {
  const vendorId = req.body.vendorID;
  if (req.body.productSource == 'shopify') await cornServices.initialProductSync(vendorId);
  // else if(req.body.productSource == 'woocommerce')
  if (req.body.productSource === 'wix') await wixService.wixProductSync(vendorId);
  // else await wooCommerceService.wooCommerceProductSync(vendorId);
  if (req.body.productSource === 'squarespace') await squarespaceService.squarespaceProductSync(vendorId);

  if (req.body.productSource === 'woocommerce') await wooCommerceService.wooCommerceProductSync(vendorId);

  return res.status(200).jsend.success({ message: 'success' });
});

const publishProductToShopify = catchAsync(async (req, res) => {
  const { productsId, productStatus } = req.body;
  if (productStatus === 'PUBLISHED') {
    const data = await cornServices.publishProductToShopify(productsId);
    if (data == true) {
      return res.status(200).jsend.success({ message: ' product published successfully' });
    } else {
      return res.status(500).jsend.error({ message: 'something went wrong' });
    }
  } else {
    const data = await cornServices.unpublishProductFromShopify(productsId);
    if (data === true) {
      return res.status(200).jsend.success({ message: ' product unpublished successfully' });
    } else {
      return res.status(500).jsend.error({ message: 'something went wrong' });
    }
  }
});

const productUpdateShopify = async (req, res) => {
  try {
    let ids;
    const vendorId = req.body.vendorId;
    // console.log("==vendorId==",vendorId)
    ids = req.body.productId;
    // console.log('---ids', ids);
    const dbProducts = await Product.find({
      _id: ids,
    }).lean();
    const user = await User.findOne({
      _id: vendorId,
      connectionType: { $in: ['shopify', 'wix', 'woocommerce', 'squarespace'] },
    }).lean();
    if (user.connectionType === 'wix') {
      for (let index = 0; index < dbProducts.length; index++) {
        const dbProduct = dbProducts[index];
        // console.log("==dbProduct===wix",dbProduct)
        await wixService.createUpdateProduct(dbProduct.venderProductPlatformId, 'update', vendorId);
      }
    }
    if (user.connectionType === 'woocommerce') {
      for (let index = 0; index < dbProducts.length; index++) {
        const dbProduct = dbProducts[index];
        // console.log('==dbProduct==woocommerce', dbProduct);
        let product = await wooCommerceService.woocommerceProduct(user.credentials, dbProduct.venderProductPlatformId);
        product = product.data;
        // console.log('=product=', product);
        await wooCommerceService.createUpdateProduct(product, vendorId);
      }
    }
    if (user.connectionType === 'shopify') {
      for (let index = 0; index < dbProducts.length; index++) {
        const dbProduct = dbProducts[index];
        // console.log('==dbProduct===shopify', dbProduct);
        const url = `https://${user.credentials.shopName}/admin/api/2022-01/products/${dbProduct.venderProductPlatformId}.json`;
        const response = await shopifyRequest('get', url, user.credentials.accessToken).catch((e) => {
          console.log(e);
        });

        const product = response.data.product;
        if (dbProduct.status === 'PUBLISHED') {
          await cornServices.createUpdateProduct(product, 'update', vendorId);
        } else {
          await cornServices.createUpdateProduct(product, 'create', vendorId);
        }
      }
    }
    if (user.connectionType === 'squarespace') {
      for (let index = 0; index < dbProducts.length; index++) {
        const dbProduct = dbProducts[index];
        await squarespaceService.updateAllVendorProducts(vendorId, dbProduct.venderProductPlatformId);
      }
    }
    return res.status(200).jsend.success({ message: 'success' });
  } catch (err) {
    console.log(err);
  }
};

const deleteAlgoliaProduct = async (req, res) => {
  const dbProducts = await Product.find({
    status: 'PUBLISHED',
  }).lean();
  console.log('🚀 ~ file: productController.js:107 ~ deleteAlgoliaProduct ~ dbProducts.length:', dbProducts.length);
  for (let index = 0; index < dbProducts.length; index++) {
    try {
      console.log('🚀 ~ file: productController.js:108 ~ deleteAlgoliaProduct ~ index:', index);
      const element = dbProducts[index];
      if (element.bndleId) {
        await cornServices.deleteProductAlgolia(element.bndleId);
      }
    } catch (error) {
      console.log('🚀 ~ file: productController.js:113 ~ deleteAlgoliaProduct ~ error:', error);
    }
  }

  // await cornServices.deleteProductAlgolia("8195892183205")
  // await syncAllShopifyProducts()
  return res.status(200).jsend.success({ message: 'success' });
};

const updateProductToAlgolia = async (req, res) => {
  const product = await Product.find({ status: 'PUBLISHED', isDeleted: false });
  console.log("🚀 ~ file: productController.js:132 ~ updateProductToAlgolia ~ product:", product.length)

  for (let element = 0; element < product.length; element++) {
    try {
      const el = product[element];
      const user = await User.findOne({ _id: el.vendorId });
      // map images
      const mappedImages = [];

      el.images.forEach((image) => {
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
      el.options.forEach((option) => {
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
        mappedOptionWithBndle = await cornServices.mapOptionWithBndle(mapOptions, el.subCategory, el.vendorId);
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
          const mappedVariantOption = await cornServices.mapWithBndleVariant(
            variant.options,
            el.subCategory,
            el.vendorId,
            vendorOptionMapping
          );
          variant.options = mappedVariantOption.mappedOption;
          canMap = mappedVariantOption.mapStatus;
        }

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
          weight_unit: cornServices.mapWeightUnit(variant.weightUnit),
          inventory_management: 'shopify',
        };

        if (variant.bndleVariantId !== undefined && variant.bndleVariantId !== '') {
          variantsObj.id = variant.bndleVariantId;
        }

        if (el.productSource !== 'direct' && variant.isEnable === true) {
          if (canMap === true) {
            variantArray.push(variantsObj);
          }
        }
        if (el.productSource === 'direct' && variant.isEnable === true) {
          variantArray.push(variantsObj);
        }
      }

      const category = el.category;
      const subCategory = el.subCategory;
      const productType = el.productCategory;
      const lifeStage = el.lifeStage;

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

      if (el.bndleId !== '') {
        await cornServices.updateProductAlgolia(
          productObj,
          category,
          el.bndleId,
          subCategory,
          productType,
          lifeStage,
          mappedOptionTags,
          el.createdAt
        );
      }
    } catch (error) {
      console.log('🚀 ~ file: productController.js:303 ~ updateProductToAlgolia ~ error:', error);
    }
  }
  return res.status(200).jsend.success({ message: 'success' });
};

const getProductToAlgolia = async (req, res) => {
  let hits = [];
  // // Get all records as an iterator
  // await index.browseObjects({
  //   batch: (batch) => {
  //     hits = hits.concat(batch);
  //   },
  // });

  await syncAlgoliaProduct()
  return res.status(200).jsend.success(hits);
};

module.exports = {
  initialProductSyncShopify,
  publishProductToShopify,
  productUpdateShopify,
  deleteAlgoliaProduct,
  updateProductToAlgolia,
  getProductToAlgolia,
};
