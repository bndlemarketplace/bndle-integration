

const createJob = async (agenda) => {
  // runs everyday at 1 am

  await agenda.every("0 1 * * *", "update_product_sq");

};

module.exports = createJob;
