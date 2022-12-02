const Product = require('./product/index');
const Order = require('./order/index');
const Adapter = require('./lib/adapter');
const authenticate = require('./lib/authenticate');

class Huboo{
  constructor() {
    this.authenticate = authenticate;
    this.product = new Product();
    this.adapter = new Adapter();
  }
}

module.exports = Huboo;