

const createJob = async (agenda) => {
  
  await agenda.every("0 0 * * *", "update_product_sq"); // runs everyday at 12 am
  await agenda.every("0 2 * * *", "delete_product_sq"); // runs everyday at 2 am
  await agenda.every("9 15 * * *", "sync_product_shopify"); // runs everyday at 1 am

};

module.exports = createJob;
