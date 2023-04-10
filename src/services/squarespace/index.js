const Product = require('./product/index');
const Order = require('./order/index');
const Inventory = require('./inventory/index');
const Webhook = require('./webhook/index');
const Adapter = require('./lib/adapter');
const authenticate = require('./lib/authenticate');

class SquareSpace{
  constructor() {
    this.authenticate = authenticate;
    this.product = new Product();
    this.order = new Order();
    this.inventory = new Inventory();
    this.webhook = new Webhook();
    this.adapter = new Adapter();
  }
}

module.exports = SquareSpace;