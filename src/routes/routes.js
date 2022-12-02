const express = require('express');
const productRoute = require('./products/productRoutes');
const config = require('../config/restifyConfig');
const webhookRoute = require('./webhooks/webhooksRoutes');
const vendorRoute = require('./vendors/vendorRoutes');
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

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;
