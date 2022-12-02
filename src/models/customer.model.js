const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const { toJSON } = require('./plugins');
const constVer = require('../config/constant');

const customerSchema = mongoose.Schema(
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
    firstName: {
      type: String,
      // required: true,
      trim: true,
    },
    lastName: {
      type: String,
      // required: true,
      trim: true,
    },
    TnC: {
      type: Boolean,
      default: false,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isGuestUser: {
      type: Boolean,
      default: false,
    },
    emailOtp: {
      type: String,
    },
    // wishlist: [mongoose.Types.ObjectId()],
    wishlist: {
      type: Array,
    },
    socialChannel: {
      type: String,
      enum: constVer.model.customer.socialChannels,
      trim: true,
    },
    address: [
      {
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
        phoneNumber: {
          type: String,
          required: true,
        },
        streetAddress: {
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
          required: true,
        },
        default: {
          type: Boolean,
          default: false,
        },
      },
    ],
    bndle: [
      {
        name: {
          type: String,
          default: '',
          trim: true,
        },
        dob: {
          type: Date,
          default: '',
        },
        gender: {
          type: String,
          enum: constVer.model.customer.genderEnum,
          trim: true,
        },
        default: {
          type: Boolean,
          default: false,
        },
      },
    ],
    mailPreferences: [{ type: Object, enum: constVer.model.user.mailPreferencesEnum }],
    customerProfile: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Customer = mongoose.model('customer', customerSchema);

module.exports = Customer;
