

const createJob = async (agenda) => {
  // runs everyday at 12 am

  await agenda.every("0 0 * * *", "generate_xml_merchant_file");
  await agenda.every("0 0 * * *", "generate_xml_facebook_file");
  

  await agenda.every("0 2 * * *", "delete_product_sq"); // runs everyday at 2 am
  // await agenda.every("0 1 * * *", "sync_product_shopify"); // runs everyday at 1 am

  // await agenda.every("0 0 * * *", "sync_shopify_permission");

  // await agenda.every("0 3 * * *", "sync_algolia_product");

  await agenda.every("0 0 * * *", "remove_old_messages");

};

module.exports = createJob;
