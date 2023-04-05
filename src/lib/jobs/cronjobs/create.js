

const createJob = async (agenda) => {
  // runs everyday at 12 am

  await agenda.every("0 0 * * *", "update_product_sq");
  await agenda.every("0 0 * * *", "generate_xml_merchant_file");
};

module.exports = createJob;
