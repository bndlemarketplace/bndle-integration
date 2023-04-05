const mongoose = require('mongoose');
const { toJSON } = require('./plugins');
// const { tokenTypes } = require('../config/tokens');
// const { ref } = require('joi');

const productVariant = mongoose.Schema(
  {
    productId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'product',
    },
    venderProductPlatformVariantId: {
      type: String,
      default: '',
      trim: true,
    },
    bndleVariantId: {
      type: String,
      default: '',
      trim: true,
    },
    bndleInventoryItemId: {
      type: String,
    },
    price: {
      type: Number,
    },
    sku: {
      type: String,
      default: '',
      trim: true,
    },
    title: {
      type: String,
      default: '',
      trim: true,
    },
    taxable: { type: Boolean, default: true },
    options: [
      {
        name: {
          type: String,
          trim: true,
        },
        value: {
          type: String,
          trim: true,
        },
      },
    ],
    isEnable: {
      type: Boolean,
      default: false,
    },
    position: {
      type: Number,
      default: 0,
      trim: true,
    },
    inventoryQuantity: {
      type: Number,
      default: 0,
    },
    openingQuantity: {
      type: Number,
      default: 0,
    },
    weight: {
      type: Number,
      default: 0,
    },
    weightUnit: {
      type: String,
      default: '',
      trim: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    images: [
      {
        bndleImageId: {
          type: String,
        },
        bndleProductId: {
          type: String,
          trim: true,
        },
        vendorImageId: {
          type: String,
        },
        bndleVariantId: {
          type: Array,
          trim: true,
        },
        position: {
          type: Number,
        },
        variantPlatformSrc: {
          type: String,
          trim: true,
        },
        src: {
          type: String,
          trim: true,
        },
      },
    ],
    isCompatible: {
      type: Boolean,
      default: false,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);
productVariant.index({ sku: 1 });
// add plugin that converts mongoose to json
productVariant.plugin(toJSON);

/**
 * @typedef Token
 */
const Variant = mongoose.model('productVariant', productVariant);

module.exports = Variant;
