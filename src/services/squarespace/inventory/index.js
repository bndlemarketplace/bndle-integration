const get = require('./get');

class Inventory{
    constructor() {
        this.get = get;
    }
}

module.exports = Inventory;