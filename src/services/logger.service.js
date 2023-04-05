const Logger = require("../models/logger.model");
const LogsModel = require("../models/logs.model")

const createLogger = async (logBody) => {
  return Logger.create(logBody);
};

const insertLog = async (venderPlatformOrderId, body, logs ) => {
  try {
    const updateObj = {
      venderPlatformOrderId,
      webHookData: body.webHookData,
      $push: {logs: logs },
      logType: body.logType,
      status: body.status
    };
    await LogsModel.update({ venderPlatformOrderId: venderPlatformOrderId }, updateObj, { upsert: true });
  } catch (error) {
    console.log("🚀 ~ file: logger.service.js:20 ~ insertLog ~ error:", error)
  }
};

module.exports = {
  createLogger,
  insertLog
}