const Product = require('./product/index');
const Order = require('./order/index');
const Adapter = require('./lib/adapter');
const authenticate = require('./lib/authenticate');
const Webhooks = require('./lib/webhook');

class WooCommerce{
  constructor() {
    this.authenticate = authenticate;
    this.product = new Product();
    // this.adapter = new Adapter();
    this.webhooks = new Webhooks();
  }
}

module.exports = WooCommerce;