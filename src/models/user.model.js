const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const { toJSON, paginate, oldPaginate } = require('./plugins');
const { roles } = require('../config/roles');
const constVer = require('../config/constant');

const userSchema = mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error('Invalid email');
        }
      },
    },
    vendorPlatformId: {
      type: String,
      default: '',
    },
    password: {
      type: String,
      default: '',
      trim: true,
      // minlength: 8,
      // validate(value) {
      //   if (!value.match(/\d/) || !value.match(/[a-zA-Z]/)) {
      //     throw new Error('Password must contain at least one letter and one number');
      //   }
      // },
      private: true, // used by the toJSON plugin
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      trim: true,
      enum: roles,
      default: constVer.model.user.defaultUserRole,
    },
    companyName: {
      type: String,
      default: '',
      trim: true,
    },
    brandName: {
      type: String,
      default: '',
      trim: true,
    },
    // userProfileImage to userProfile
    userProfile: {
      type: String,
      default: '',
      trim: true,
    },
    mobileNumber: {
      type: String,
      trim: true,
      required: true,
    },
    vendorCode: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      trim: true,
      enum: constVer.model.user.statusEnum,
      default: constVer.model.user.defaultStatus,
    },
    deactivatedDateTime: {
      type: Date,
      default: '',
    },
    otp: {
      type: String,
      trim: true,
      default: '',
    },
    deactivatedReason: {
      type: String,
      default: '',
      trim: true,
    },
    deactivatedBy: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
    },
    addedBy: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isMobileVerified: {
      type: Boolean,
      default: false,
    },
    socialLoginType: {
      type: String,
      trim: true,
      enum: constVer.model.user.socialLoginTypeEnum,
    },
    typeOfAccount: {
      type: String,
      trim: true,
      enum: constVer.model.user.typeOfAccountEnum,
      default: constVer.model.user.defaultTypeOfAccount,
    },
    credentials: {
      apiUrl: { type: String, trim: true, index: true, unique: true, sparse: true },
      apiKey: { type: String, trim: true, index: true, unique: true, sparse: true },
      apiSecret: { type: String, trim: true, index: true, unique: true, sparse: true },
      apiPassword: { type: String, trim: true, index: true, unique: true, sparse: true }, // required for Shopify
      apiVersion: { type: String, trim: true, index: true, unique: true, sparse: true },
      accessToken: { type: String, trim: true, index: true, unique: true, sparse: true },
      refreshToken: { type: String, trim: true, index: true, unique: true, sparse: true },
      shopName: { type: String, trim: true, index: true, unique: true, sparse: true }, // required for shopify4
      urls: {},
    },
    webhookSchema: {
      webhookId: { type: String },
      event: { type: String },
      webhookUrl: { type: String },
      isActive: { type: Boolean, default: true },
      endpointUrl: { type: String },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    },
    connectionType: {
      type: String,
      trim: true,
      enum: constVer.model.user.connectionTypeEnum,
    },
    deliveryDescription: {
      type: String,
      default: '',
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    logo: {
      type: String,
      default: '',
      trim: true,
    },
    coverImage: {
      type: String,
      default: '',
      trim: true,
    },
    billingAddressSameAsShippingAddress: {
      type: Boolean,
      default: false,
    },
    standardShipping: {
      enabled: {
        type: Boolean,
        default: false,
      },
      price: {
        type: Number,
        default: 0,
      },
    },
    expressShipping: {
      enabled: {
        type: Boolean,
        default: false,
      },
      price: {
        type: Number,
        default: 0,
      },
    },
    freeShipping: {
      enabled: {
        type: Boolean,
        default: false,
      },
      price: {
        type: Number,
        default: 0,
      },
    },
    shippingMethods: [
      {
        name: {
          type: String,
          default: '',
        },
        type: {
          type: String,
          enum: constVer.model.user.shippingMethods,
          default: constVer.model.user.defaultShippingMethods,
        },
        price: {
          type: Number,
          default: 0,
        },
        enabled: {
          type: Boolean,
          default: false,
        },
      },
    ],
    shippingAddress: [
      {
        streetAddress: {
          type: String,
          default: '',
          trim: true,
        },
        city: {
          type: String,
          default: '',
          trim: true,
        },
        county: {
          type: String,
          default: '',
          trim: true,
        },
        postalCode: {
          type: String,
          default: '',
          trim: true,
        },
        countryCode: {
          type: String,
          default: '',
          trim: true,
        },
      },
    ],
    billingAddress: [
      {
        streetAddress: {
          type: String,
          default: '',
          trim: true,
        },
        city: {
          type: String,
          default: '',
          trim: true,
        },
        county: {
          type: String,
          default: '',
          trim: true,
        },
        postalCode: {
          type: String,
          default: '',
          trim: true,
        },
        countryCode: {
          type: String,
          default: '',
          trim: true,
        },
      },
    ],
    bankDetails: [
      {
        region: {
          type: String,
          default: '',
          trim: true,
        },
        bankName: {
          type: String,
          default: '',
          trim: true,
        },
        accountName: {
          type: String,
          default: '',
          trim: true,
        },
        accountNumber: {
          type: String,
          default: '',
          trim: true,
        },
        shortCode: {
          type: String,
          default: '',
          trim: true,
        },
        iban: {
          type: String,
          default: '',
          trim: true,
        },
        bic_swift: {
          type: String,
          default: '',
          trim: true,
        },
      },
    ],
    lastGuaranteedDayDelivery: [
      {
        sessionEvent: {
          type: String,
          default: '',
          trim: true,
        },
        lastOrderDate: {
          type: Date,
          default: '',
          trim: true,
        },
        deliveryRestartDate: {
          type: Date,
          default: '',
          trim: true,
        },
        deliveryMessage: {
          type: String,
          default: '',
          trim: '',
        },
      },
    ],
    shopWebsite: {
      type: String,
      default: '',
      trim: true,
    },
    shopContactNumber: {
      type: String,
      trim: true,
    },
    isSellerOfTheWeek: {
      type: Boolean,
    },
    autoProductSynced: {
      type: Boolean,
    },
    totalUserRated: {
      type: Number,
    },
    totalRatingSum: {
      type: Number,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isMapped: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// add plugin that converts mongoose to json
userSchema.plugin(toJSON);
userSchema.plugin(paginate);
userSchema.plugin(oldPaginate);

/**
 * Check if email is taken
 * @param {string} email - The user's email
 * @param {ObjectId} [excludeUserId] - The id of the user to be excluded
 * @returns {Promise<boolean>}
 */
userSchema.statics.isEmailTaken = async function (email, excludeUserId) {
  const user = await this.findOne({ email, _id: { $ne: excludeUserId } });
  return !!user;
};

/**
 * Check if password matches the user's password
 * @param {string} password
 * @returns {Promise<boolean>}
 */
userSchema.methods.isPasswordMatch = async function (password) {
  const user = this;
  return bcrypt.compare(password, user.password);
};

userSchema.pre('save', async function (next) {
  const user = this;
  if (user.isModified('password')) {
    user.password = await bcrypt.hash(user.password, 8);
  }
  next();
});

/**
 * @typedef User
 */
const User = mongoose.model('User', userSchema);

module.exports = User;
