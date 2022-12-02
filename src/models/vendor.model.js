const mongoose = require('mongoose');

const vendorStatusSchema = new mongoose.Schema({
  status: {type: Number},
  initialProductImportCompleted: {type: Boolean, default: false}
});

const bankSchema = new mongoose.Schema({
  name: { type: String },
}, { _id: false });

const accountDetailsSchema = new mongoose.Schema({
  accountName: { type: String },
  accountNumber: { type: String },
  accountSortCode: { type: String },
  paypalEmail: { type: String },
  accountIban: { type: String },
  accountSwift: { type: String },
  bank: bankSchema,
}, { _id: false, timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

const financeSchema = new mongoose.Schema({
  paymentMethod: { type: String },
  accountsEmail: { type: String },
  accountDetails: accountDetailsSchema,
}, { _id: false, timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

const webhookSchema = new mongoose.Schema({
  webhookId: {type: String},
  event: {type: String},
  webhookUrl: { type: String },
  isActive: { type: Boolean, default: true },
  endpointUrl: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

const credentialsSchema = new mongoose.Schema({
  apiUrl: { type: String },
  apiKey: { type: String },
  apiSecret: { type: String },
  apiPassword: { type: String }, // required for Shopify
  apiVersion: { type: String },
  accessToken: { type: String },
  refreshToken: { type: String },
}, { _id: false });

const platformSchema = new mongoose.Schema({
  name: { type: String },
  credentials: credentialsSchema,
  hasWebhooks: { type: Boolean, default: true },
  webhooks: [webhookSchema],
});

const VendorModelSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  platform: platformSchema,
  finance: financeSchema,
  status: vendorStatusSchema
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

module.exports = mongoose.model('Vendor', VendorModelSchema);
