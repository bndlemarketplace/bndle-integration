const logger = require('../../../config/logger');
const axios = require('axios');

const func = async (id) => {
  console.log(id);
  return axios({
    method: 'get',
    url: `https://jsonplaceholder.typicode.com/todos`,
    headers: { 'Content-Type': 'application/json' },
  })
}

module.exports = async function ({ data }) {
  try {
    const id = data.id;
    logger.info("processing job for " + id);

    for (let index = 0; index < 20; index++) {
      console.log(id + "  index:" + index)
      await func(id);
    }
    console.log('done ' + id)

    // if (!res) {
    //   throw new Error("Publish product to shopify job for id" + id + " fails");
    // } else {
      logger.info(id + " : job completed");
    // }
  } catch (err) {
    logger.info(err);
    throw new Error("Unhandled error in tasks/processor.js", err);
  }
};