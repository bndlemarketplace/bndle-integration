const constVer = require('../../../config/constant');
class Adapter {

  convertPlatformVariantToRemoteVariant(variant, platformProduct, dbProduct, index) {

    let mappedOption = [];
    for (const attr in variant.attributes) {
      mappedOption.push({
        name: attr,
        value: variant.attributes[attr]
      })
    };

    let mappedVariantImages = [];
    if (variant.image) {
      mappedVariantImages.push({
        bndleImageId: '',
        bndleProductId: dbProduct._id.toString(),
        vendorImageId: variant.image.id,
        position: variant.image.orderIndex,
        variantPlatformSrc: variant.image.url,
        src: variant.image.url,
      })
    }

    const variantObj = {
      productId: dbProduct._id,
      venderProductPlatformVariantId: variant.id,
      price: variant.pricing.basePrice.value,
      position: index + 1,
      options: mappedOption,
      venderSku: variant.sku,
      sku: variant.sku,
      title: variant.attributes ? Object.values(variant.attributes).join('/') : '',
      inventoryQuantity: variant.stock.unlimited ? constVer.model.product.quantityLimit + "" : variant.stock.quantity,
      openingQuantity: variant.stock.unlimited ? constVer.model.product.quantityLimit + "" : variant.stock.quantity,
      weight: variant.shippingMeasurements.weight.value,
      weightUnit: variant.shippingMeasurements.weight.unit,
      images: mappedVariantImages,
      isDeleted: false,
      isDefault: platformProduct.variants.length === 1 ? true : false,
      isEnable: true,
      isCompatible: true
    };
    return variantObj;
  }

  convertRemoteVariantToPlatformVariant() {

  }

  convertRemoteProductToPlatformProduct(product) {
    const platformProduct = {}; // should be a platfrom product model instance    

    return platformProduct;
  }

  convertPlatformProductToRemoteProduct(product, vendorId, vendorName) {
    let remoteProduct = {}; // should be a platfrom product model instance
    // for map image data to fit in our db
    const mappedImages = [];
    if (product.images.length) {
      for (let i = 0; i < product.images.length; i++) {
        const img = product.images[i];
        const imgObj = {
          bndleImageId: '',
          bndleProductId: product._id,
          vendorImageId: img.id,
          src: img.url,
          position: i + 1,//not available
        };
        mappedImages.push(imgObj);
      }
    }

    let mappedOptions = [];
    let optionValues;
    if (product.variantAttributes && product.variantAttributes.length) {
      product.variantAttributes.forEach((element, index) => {

        optionValues = [];
        product.variants.forEach((v) => {
          if (v.attributes && v.attributes[element] && !optionValues.includes(v.attributes[element]))
            optionValues.push(v.attributes[element])
        });

        const optionObj = {
          venderProductPlatformOptionId: '',
          name: element,
          position: index + 1,
          values: optionValues,
        };
        mappedOptions.push(optionObj);
      });
    }

    remoteProduct = {
      venderProductPlatformId: product.id,
      productSource: constVer.model.product.productSourceEnum[4],
      title: product.name,
      description: product.description,
      vendorId: vendorId,
      vendorName: vendorName,
      productType: product.type,
      status: constVer.model.product.STATUS[5],
      tags: product.tags,
      images: mappedImages,
      options: mappedOptions,
      isDeleted: false,
    };
    return remoteProduct;
  }

  convertRemoteOrderToPlatformOrder(order) {
    const platformOrder = {}; // should be a platfrom order model instance

    return platformOrder;
  }

  convertPlatformOrderToRemoteOrder(order) {
    const remoteOrder = {}; // should be a remote order model instance

    return remoteOrder;
  }

  updateRemoteProductFromPlatformProduct(platformProduct, dbProduct) {
    let imgArr = []; // update only images as for now
    let imgObj = {};

    (platformProduct.images || []).forEach((img, i) => {
      imgObj = {
        bndleImageId: '',
        bndleProductId: platformProduct.id,
        vendorImageId: img.id,
        src: img.url,
        position: i + 1,//not available
      };
      imgArr.push(imgObj);
    })
    dbProduct.images = imgArr;

    return dbProduct;
  }

  updateRemoteVariantFromPlatformVariant(platformVariant, dbVariant, dbProduct) {
    let imgArr = [];  // update only images and stock as for now

    if (platformVariant && platformVariant.image) { // only single image for variant in squarepace
      const imgObj = {
        bndleImageId: '',
        bndleProductId: dbProduct._id.toString(),
        vendorImageId: platformVariant.image.id,
        position: platformVariant.image.orderIndex,
        variantPlatformSrc: platformVariant.image.url,
        src: platformVariant.image.url,
      }
      imgArr.push(imgObj);
    }
    dbVariant.images = imgArr;

    dbVariant.openingQuantity = platformVariant.stock.unlimited ? constVer.model.product.quantityLimit + "" : platformVariant.stock.quantity;
    dbVariant.inventoryQuantity = platformVariant.stock.unlimited ? constVer.model.product.quantityLimit + "" : platformVariant.stock.quantity;

    return dbVariant;
  }
}

module.exports = Adapter;
