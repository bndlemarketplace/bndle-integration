const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const logsSchema = mongoose.Schema(
  {
    venderPlatformOrderId: { type: String },
    webHookData: {},
    logs: { type: Array },
    logType: { type: String },
    status: { type: String }
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// add plugin that converts mongoose to json
logsSchema.plugin(toJSON);
logsSchema.plugin(paginate);

const Logs = mongoose.model('Logs', logsSchema);

module.exports = Logs;
