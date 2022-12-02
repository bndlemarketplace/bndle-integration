const get = require('./get');
const put = require('./put');

class Product{
    constructor() {
        this.get = get;
        this.put = put;
    }
}

module.exports = Product;