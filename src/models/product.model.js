const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');
const constVer = require('../config/constant');

const productSchema = mongoose.Schema(
  {
    // this flag is for keep track of unpublish product disable because vendor inactive
    vendorInactive: {
      type: Boolean,
      default: false,
    },
    // bndel id - store product id
    bndleId: {
      type: String,
      trim: true,
      default: '',
    },
    venderProductPlatformId: {
      // product_id
      type: String,
      trim: true,
      default: '',
    },
    productSource: {
      type: String,
      enum: constVer.model.product.productSourceEnum,
      trim: true,
      default: 'direct',
    },
    title: {
      type: String,
      trim: true,
      default: 'Product Title',
      require: true,
    },
    description: {
      type: String,
      trim: true,
      default: 'Product Description',
      require: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // sopify vender
    vendorName: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
    },
    subCategory: {
      type: String,
      trim: true,
    },
    // sub category name
    productCategory: {
      type: String,
      trim: true,
    },
    lifeStage: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(constVer.model.product.STATUS),
      trim: true,
      uppercase: true,
      default: constVer.model.product.STATUS.DISABLED,
    },
    specialTags: [
      {
        type: String,
        trim: true,
        uppercase: true,
        required: true,
        enum: Object.values(constVer.model.product.SPECIAL_TAGS),
      },
    ],
    tags: [
      {
        type: String,
        required: true,
        trim: true,
      },
    ],
    images: [
      {
        bndleImageId: {
          typeString: String,
        },
        bndleProductId: {
          type: String,
          trim: true,
        },
        vendorImageId: {
          type: String,
          trim: true,
        },
        position: {
          type: Number,
          required: true,
        },
        src: {
          type: String,
          trim: true,
        },
      },
    ],
    metaKeywords: {
      type: String,
      trim: true,
    },
    metaDescriptions: {
      type: String,
      trim: true,
    },
    options: [
      {
        venderProductPlatformOptionId: {
          type: String,
          default: '',
          trim: true,
        },
        bndleOptionId: {
          type: String,
          default: '',
        },
        name: {
          type: String,
          default: '',
        },
        position: {
          type: Number,
        },
        values: [],
        // isRequireL: Boolean,
      },
    ],
    manufacture: {
      type: String,
    },
    metafield_id: {
      type: String,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isCompatible: {
      type: Boolean,
      default: false,
    },
    allVariantCompatible: {
      type: Boolean,
      default: false,
    },
    // VAT: {
    //   type: Number,
    // },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

productSchema.index({ isDeleted: 1 });
productSchema.index({ category: 1 });
productSchema.index({ status: 1 });

// add plugin that converts mongoose to json
productSchema.plugin(toJSON);
productSchema.plugin(paginate);
/**
 * @typedef Token
 */
const product = mongoose.model('product', productSchema);

module.exports = product;
