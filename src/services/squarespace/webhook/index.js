const put = require('./put');
const get = require('./get');

class Webhook {
    constructor() {
        this.put = put;
        this.get = get;
    }
}

module.exports = Webhook;