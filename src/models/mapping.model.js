const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const variantMapping = mongoose.Schema(
  {
    vendorId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'product',
    },
    availableVendorOptions: [
      {
        optionName: {
          type: String,
        },
        optionValues: [String],
      },
    ],
    optionMapping: [
      {
        subCategory: {
          type: String,
          enum: ['Maternity', 'Shoes', 'Others'],
        },
        vendorOptionName: {
          type: String,
        },
        bundleOptionName: {
          type: String,
          enum: ['Color', 'Size', 'Age'],
        },
        valueMapping: {},
      },
    ],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// add plugin that converts mongoose to json
variantMapping.plugin(toJSON);
variantMapping.plugin(paginate);

const VariantMapping = mongoose.model('variantMapping', variantMapping);

module.exports = VariantMapping;
