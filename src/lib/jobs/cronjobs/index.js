module.exports = (agenda) => ({
  create: require('./create')(agenda),
  updateProductSQ: require('./udpateProductSquarespace')(agenda),
});
