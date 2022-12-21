const express = require('express');
const productRoute = require('./products/productRoutes');
const config = require('../config/restifyConfig');
const webhookRoute = require('./webhooks/webhooksRoutes');
const vendorRoute = require('./vendors/vendorRoutes');

const { updateAllVendorProducts } = require('../services/squarespace/squarespaceService');
const { AddJobCallTodos } = require('../lib/jobs/queue/addToQueue');

const router = express.Router();

const defaultRoutes = [
  {
    path: '/products',
    route: productRoute,
  },
  {
    path: '/webhooks',
    route: webhookRoute,
  },
  {
    path: '/vendors',
    route: vendorRoute,
  },
];

// test 
// router.route('/check').get(updateAllVendorProducts);
// router.route('/checktodos').get(((req, res) => {
//   AddJobCallTodos(req.body.id);
//   res.json('done')
// }));

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;
