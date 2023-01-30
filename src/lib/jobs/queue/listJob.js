const { productPublishShopifyQueue, productPublishShopifyQueue2 } = require(".");

const getJobs = async (req, res) => {
    let status;
    switch (req.query.status) {
        case 'completed':
            status = 'completed'
            break
        case 'active':
            status = 'active'
            break
        case 'failed':
            status = 'failed'
            break
        default:
            status = ''
    }
    const jobs = await productPublishShopifyQueue.getJobs(status);
    res.json(jobs)
}

module.exports = {
    getJobs
}