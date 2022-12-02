const Logger = require("../models/logger.model");


const createLogger = async (logBody) => {
  return Logger.create(logBody);
};

module.exports = {
  createLogger
}