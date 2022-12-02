const mongoose = require('mongoose');
const constVer = require('../config/constant');

const LoggerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: '',
    },
    level: {
      type: String,
      enum: constVer.model.logger.levelEnum,
      trim: true,
      default: 'error',
    },
    type: {
      type: String,
      enum: constVer.model.logger.typeEnum,
      trim: true,
      default: 'sync',
    },
    logs: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model('Logger', LoggerSchema);
