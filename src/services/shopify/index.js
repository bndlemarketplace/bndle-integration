const Product = require('./product/index');
const Order = require('./order/index');
const Adapter = require('./lib/adapter');
const authenticate = require('./lib/authenticate');
const Webhooks = require('./lib/webhooks');

class Shopify {
  constructor() {
    this.authenticate = authenticate;
    this.product = new Product();
    this.adapter = new Adapter();
    this.webhooks = new Webhooks();
    this.order = new Order();
  }
}

module.exports = Shopify;
