const constVer = require('../../../config/constant');
class Adapter {
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
          bndleImageId: img.id,
          bndleProductId: product.id,
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
}

module.exports = Adapter;
