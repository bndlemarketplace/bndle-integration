const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const vendorOrderSchema = mongoose.Schema(
  {
    customerId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'customer',
      default: null,
      trim: true,
    },
    subOrderId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'vendorOrder',
      default: null,
      trim: true,
    },
    orderId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'order',
      default: null,
      trim: true,
    },
    orderCode: {
      type: String,
    },
    subOrderCode: {
      type: String,
    },
    cancelReason: {
      type: String,
    },
    cancelAt: {
      type: Date,
    },
    shippingDate: {
      type: Date,
    },
    returnItems: [
      {
        productRef: {
          type: mongoose.SchemaTypes.ObjectId,
          ref: 'product',
          // default: null,
          trim: true,
        },
        productId: {
          type: String,
          trim: true,
        },
        vendorProductId: {
          type: String,
          trim: true,
        },
        variantRef: {
          type: mongoose.SchemaTypes.ObjectId,
          ref: 'productVariant',
          // default: null,
          trim: true,
        },
        vendorVariantId: {
          type: String,
          trim: true,
        },
        variantId: {
          type: String,
          trim: true,
        },
        quantity: {
          type: Number,
        },
        receivedQuantity: {
          type: Number,
          default: 0,
        },
        price: {
          type: Number,
        },
        amountToBeRefund: {
          type: Number,
          default: 0,
        },
        adminRefundedAmount: {
          type: Number,
        },
        isRefunded: {
          type: Boolean,
        },
        refundAmount: {
          type: Number,
          default: 0,
        },
      },
    ],
    // orderTotal: {
    //   type: Number,
    //   default: 1,
    // },
    venderPlatformOrderId: {
      type: String,
      default: '',
    },
    isCancel: {
      type: Boolean,
    },
    status: {
      type: String,
      default: 'NEW',
    },
    statusHistory: [
      {
        status: {
          type: String,
        },
        date: {
          type: Date,
        },
      },
    ],
    vendorId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
      default: null,
      trim: true,
    },
    trackingId: {
      type: String,
      default: '',
    },
    trackingUrl: {
      type: String,
      default: '',
    },
    carrier: {
      type: String,
    },
    note: {
      type: String,
    },
    product: [
      {
        vendorProductId: {
          type: String,
          trim: true,
        },
        productRef: {
          type: mongoose.SchemaTypes.ObjectId,
          ref: 'product',
          default: null,
          trim: true,
        },
        productId: {
          type: String,
          trim: true,
        },
        vendorVariantId: {
          type: String,
          trim: true,
        },
        variantId: {
          type: String,
          trim: true,
        },
        variantRef: {
          type: mongoose.SchemaTypes.ObjectId,
          ref: 'productVariant',
          default: null,
          trim: true,
        },
        quantity: {
          type: Number,
          default: 1,
        },
        price: {
          type: Number,
        },
        productTotal: {
          type: Number,
        },
        amountWithoutTax: {
          type: Number,
          default: 0,
        },
        VAT: {
          type: Number,
        },
      },
    ],
    shippingOptions: {
      isGift: { type: Boolean, default: false },
      giftMsg: { type: String },
      shipment: {
        type: { type: String, default: 'FREE' },
        name: { type: String, default: 'Free Shipping' },
        price: { type: Number, default: 0 },
      },
    },
    // tex: {
    //   type: Number,
    //   default: 0,
    // },
    total: {
      type: Number,
      default: 0,
    },
    subtotal: {
      type: Number,
    },
    shippingAndHandling: {
      type: Number,
    },
    shippingAddress: {
      firstName: {
        type: String,
        required: true,
        trim: true,
      },
      lastName: {
        type: String,
        required: true,
        trim: true,
      },
      phone: {
        type: String,
        required: true,
      },
      street: {
        type: String,
        required: false,
      },
      building: {
        type: String,
      },
      city: {
        type: String,
      },
      postalCode: {
        type: String,
        required: false,
      },
    },
    billingAddress: {
      firstName: {
        type: String,
        required: true,
        trim: true,
      },
      lastName: {
        type: String,
        required: true,
        trim: true,
      },
      phone: {
        type: String,
        required: true,
      },
      street: {
        type: String,
        required: true,
      },
      building: {
        type: String,
      },
      city: {
        type: String,
      },
      postalCode: {
        type: String,
        required: false,
      },
    },
    returnLabelUrl: {
      type: String,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// add plugin that converts mongoose to json
vendorOrderSchema.plugin(toJSON);
vendorOrderSchema.plugin(paginate);

const OrderSchema = mongoose.model('vendorOrder', vendorOrderSchema);

module.exports = OrderSchema;
