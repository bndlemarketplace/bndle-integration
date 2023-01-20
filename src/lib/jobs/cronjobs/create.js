

const createJob = async (agenda) => {
  
  await agenda.every("0 0 * * *", "update_product_sq"); // runs everyday at 12 am
  await agenda.every("0 2 * * *", "delete_product_sq"); // runs everyday at 2 am

};

module.exports = createJob;
