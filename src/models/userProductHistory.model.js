const mongoose = require('mongoose');

const UserProductHistorySchema = mongoose.Schema(
  {
    userToken: { type: String },
    bndleId: {
      type: String,
    },
    event: {
      type: String,
    },
    count: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const UserProductHistory = mongoose.model('UserProductHistory', UserProductHistorySchema);

module.exports = UserProductHistory;
