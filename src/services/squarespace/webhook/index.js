const put = require('./put');

class Webhook{
    constructor() {
        this.put = put;
    }
}

module.exports = Webhook;