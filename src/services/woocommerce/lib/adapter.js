const { Product, ProductVariants } = require('../../../models');

class Adapter {
  async convertRemoteProductToPlatformProduct(products,userData) {
    let allProduct = []; 
    await products.forEach(async (product) => {

       // for map image data to fit in our db
       let mappedImages = [];
       await product.images.forEach((img) => {
           const imgObj = {
             bndleImageId: img.id,
            //  bndleProductId: img.product_id,
            //  position: img.position,
             src: img.src,
           };
           mappedImages.push(imgObj);
       });

      let platformProduct = {
        // bndleId,
        venderProductPlatformId: product.id,
        productSource: 'woocommerce',
        // title: ,
        description:product.description,
        //vendorId
        //vendorName
        category:'not get it',
        subCategory:'not get it',
        productCategory:'not get it',
        lifeStage:'not get it',
        status:'ENABLED',
        // specialTags:,
        tags:product.tags,
        images:mappedImages,
        metaKeywords:'not get it',
        metaDescriptions:'not get it',
        options: 'not get it',
        manufacture:'not get it',
      }

        // create product
        const dbProduct = await Product.findOneAndUpdate(
          { venderProductPlatformId: platformProduct.venderProductPlatformId },
          platformProduct,
          {
            upsert: true,
            new: true,
          }
        );

      let platformProductVariant = await convertRemoteProductVariantToPlatformProductVariant(product, dbProduct);

       //  await ProductVariants.findOneAndUpdate({ venderProductPlatformVariantId: variant.id }, platformProductVariant, {
    //   upsert: true,
    //   new: true,
    // });
    });

    // return allProduct;
  }

  async convertRemoteProductVariantToPlatformProductVariant(product, dbProduct){
     let platformProductVariant = {
      productId:dbProduct._id,
     // venderProductPlatformVariantId:,
      status:'ENABLED',
    //  bndleVariantId:,
      price:product.price,
      sku:product.sku,
      title:'not get it',
      taxable:false,
      //options:,
      //position:,
      inventoryQuantity:'not get it',
      openingQuantity:'not get it',
      weight:product.weight,
      weightUnit:'not get it',
      isDeleted:false,
     }

     if(product.tax_status == 'taxable') platformProductVariant.taxable = true;
   return platformProductVariant;
  }

  convertPlatformProductToRemoteProduct(product) {
    const remoteProduct = {}; // should be a platfrom product model instance

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
