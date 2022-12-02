const get = require('./get');
const put = require('./put');

class Order{
    constructor() {
        this.get = get;
        this.put = put;
    }
}

module.exports = Order;