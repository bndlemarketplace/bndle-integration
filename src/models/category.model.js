const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const categorySchema = mongoose.Schema(
  {
    primaryCategory: {
      type: String,
    },
    secondaryCategories: [
      {
        secondaryCategory: {
          type: String,
        },
        tertiaryCategories: [
          {
            tertiaryCategory: { type: String },
            VAT: { type: Number },
            count: { type: Number },
          },
        ],
      },
    ],
    categoryType: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    categoryName: {
      type: String,
      trim: true,
      required: true,
    },
    image: {
      type: String,
      trim: true,
    },
    parentId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'category',
      default: null,
      trim: true,
    },
    status: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// add plugin that converts mongoose to json
categorySchema.plugin(toJSON);
categorySchema.plugin(paginate);

const Category = mongoose.model('category', categorySchema);

module.exports = Category;
