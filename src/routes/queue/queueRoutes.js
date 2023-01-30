const express = require('express');
const controller = require('../../lib/jobs/queue/listJob');

const router = express.Router();

// shopify webhooks
router.route('/list').get(controller.getJobs);

module.exports = router;
