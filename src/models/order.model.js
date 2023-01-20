const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const orderSchema = mongoose.Schema(
  {
    customerId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'customer',
      default: null,
      trim: true,
    },
    orderCode: {
      type: String,
    },
    payment: {
      intentId: { type: String },
      totalAmount: { type: Number },
      status: { type: String },
    },
    discount: {
      promocodeId: {
        type: mongoose.SchemaTypes.ObjectId,
        ref: 'promocode',
        default: null,
        trim: true,
      },
      percentage: { type: Number },
      discountAmount: { type: Number },
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
    lastStatus: {
      type: String,
    },
    note: {
      type: String,
    },
    vendor: [
      {
        subOrderId: {
          type: mongoose.SchemaTypes.ObjectId,
          ref: 'vendorOrder',
          default: null,
          trim: true,
        },
        discount: {
          promocodeId: {
            type: mongoose.SchemaTypes.ObjectId,
            ref: 'promocode',
            default: null,
            trim: true,
          },
          percentage: { type: Number },
          discountAmount: { type: Number },
        },
        subOrderCode: {
          type: String,
        },
        isCancel: {
          type: Boolean,
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
        venderPlatformOrderId: {
          type: String,
          default: '',
        },
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
            isCancelled: {
              type: Boolean,
            },
          },
        ],
        product: [
          {
            productRef: {
              type: mongoose.SchemaTypes.ObjectId,
              ref: 'product',
              // default: null,
              trim: true,
            },
            vendorProductId: {
              type: String,
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
            variantRef: {
              type: mongoose.SchemaTypes.ObjectId,
              ref: 'productVariant',
              // default: null,
              trim: true,
            },
            variantId: {
              type: String,
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
              default: 0,
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
      },
    ],
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
    status: {
      type: String,
    },
    isCancel: {
      type: Boolean,
      default: false,
    },
    trackingId: {
      type: String,
      default: '',
    },
    trackingUrl: {
      type: String,
      default: '',
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
orderSchema.plugin(toJSON);
orderSchema.plugin(paginate);

const OrderSchema = mongoose.model('order', orderSchema);

module.exports = OrderSchema;
