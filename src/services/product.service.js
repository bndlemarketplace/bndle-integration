const {Product, Category, ProductVariants } = require('../models');
const cornServices = require('../cornJob/shopifyCorn');
const axios = require('axios');

const categoryUpdateHelper = async (product) => {
  if (product.category !== 'Support') {
    const count = await Product.countDocuments({
      category: product.category,
      subCategory: product.subCategory,
      productCategory: product.productCategory,
      status: 'PUBLISHED',
      isDeleted: false,
    });
    await Category.findOneAndUpdate(
      {
        primaryCategory: product.category,
        secondaryCategories: { $exists: true },
        'secondaryCategories.secondaryCategory': product.subCategory,
        'secondaryCategories.tertiaryCategories.tertiaryCategory': product.productCategory,
      },
      {
        $set: { 'secondaryCategories.$[y].tertiaryCategories.$[xxx].count': count },
      },
      {
        arrayFilters: [{ 'y.secondaryCategory': product.subCategory }, { 'xxx.tertiaryCategory': product.productCategory }],
      }
    );
    const categoryData = await Category.aggregate([
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
    const isExist = categoryData[0].data.tertiaryCategories.some((t) => t.count > 0);
    if (isExist) {
      await Category.updateOne(
        {
          secondaryCategories: { $exists: true },
          primaryCategory: product.category,
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
    const count = await Product.countDocuments({
      category: product.category,
      subCategory: product.subCategory,
      status: 'PUBLISHED',
      isDeleted: false,
    });
    await Category.findOneAndUpdate(
      {
        primaryCategory: product.category,
        secondaryCategories: { $exists: true },
        'secondaryCategories.secondaryCategory': product.subCategory,
      },
      { $set: { 'secondaryCategories.$[xxx].count': count } },
      {
        arrayFilters: [{ 'xxx.secondaryCategory': product.subCategory }],
      }
    );
  }
};

const getProductById = async (id) => {
  const aggregatePipeline = [
    { $match: { _id: id } },
    {
      $lookup: {
        from: 'productvariants',
        let: {
          product_id: '$_id',
        },
        pipeline: [
          {
            $match: {
              isDeleted: false,
              $expr: {
                $eq: ['$productId', '$$product_id'],
              },
            },
          },
        ],
        as: 'productVariant',
      },
    },
  ];

  // eslint-disable-next-line no-return-await
  return await Product.aggregate(aggregatePipeline);
}; 

const deleteProductById = async (productId) => {
  const product = await getProductById(productId);
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  } else {
    await ProductVariants.updateMany({ productId }, { isDeleted: true }, { new: true });
    return await Product.findOneAndUpdate({ _id: productId }, { isDeleted: true });
  }
};

const deleteProduct = async (productId, userId) => {
  const product = await Product.findOne({ venderProductPlatformId: productId }).select({ _id: 1 }).lean();
  product && await deleteProductById(product._id);
  const currentProduct = await getProductById(product._id);
  currentProduct?.length > 0 && await categoryUpdateHelper(currentProduct[0]);
  if (currentProduct?.length > 0 && currentProduct[0].bndleId && currentProduct[0].status === 'PUBLISHED')
    await cornServices.deleteProductById(currentProduct[0].bndleId);
  // return res.status(httpStatus.OK).jsend.success({ message: 'Product deleted successfully.' });
};

module.exports = {
  deleteProduct,
};