const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') }); 
const express = require('express');
// const restify = require('restify');
const fs = require('fs');
const https = require('https');
const mongoose = require('mongoose');
const jsend = require('jsend');
const restifyConfig = require('./config/restifyConfig');
const ApiError = require('./utils/ApiError');
const { errorConverter, errorHandler } = require('./middlewares/error');
const logger = require('./config/logger');
const app = require('./app');
let privateKey;
let certificate;
let ca;
let httpsServer;

if (restifyConfig.mode === 'server') {
  privateKey = fs.readFileSync(__dirname + '/../../demoCerts/privkey.pem', 'utf8');
  certificate = fs.readFileSync(__dirname + '/../../demoCerts/cert.pem', 'utf8');
  ca = fs.readFileSync(__dirname + '/../../demoCerts/chain.pem', 'utf8');
  const credentials = {
    key: privateKey,
    cert: certificate,
    ca: ca,
  };
  httpsServer = https.createServer(credentials, app);
}

// parse json request body
app.use(express.json());

// parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// const server = restify.createServer({
//   name: restifyConfig.name,
//   version: restifyConfig.version,
// });
app.use(jsend.middleware);

// const restifySwaggerJsdoc = require('restify-swagger-jsdoc');
// restifySwaggerJsdoc.createSwaggerPage({
//   title: 'API documentation', // Page title
//   version: '1.0.0', // Server version
//   server: server, // Restify server instance created with restify.createServer()
//   schemes: ['http', 'https'],
//   path: '/docs/swagger', // Public url where the swagger page will be available
//   apis: ['src/routes/**/*.js', 'src/swagger-definitions/**/*.yml', 'src/swagger-definitions/*.yml'],
// });

// send back a 404 error for any unknown api request
// app.use((req, res, next) => {
//   next(new ApiError(404, 'Not found'));
// });

// convert error to ApiError, if needed
app.use(errorConverter);

// handle error
app.use(errorHandler);

let serverOn;
mongoose.connect(restifyConfig.mongoose.url).then(() => {
  logger.info('Connected to MongoDB');
  if (restifyConfig.mode === 'server') {
    serverOn = app.listen(restifyConfig.port, () => {
      logger.info(`Listening to port ${restifyConfig.port}`);
    });
    // serverOn = httpsServer.listen(restifyConfig.port, () => {
    //   logger.info(`Listening to https port ${restifyConfig.port}`);
    // });
  } else {
    serverOn = app.listen(restifyConfig.port, () => {
      logger.info(`Listening to port ${restifyConfig.port}`);
    });
    // serverOn = app.listen(restifyConfig.port, () => {
    //   logger.info(`Listening to http port ${restifyConfig.port}`);
    // });
  }
});


const unexpectedErrorHandler = (error) => {
  logger.error(error);
  exitHandler();
};

const exitHandler = () => {
  if (serverOn) {
    serverOn.close(() => {
      logger.info('Server closed');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);
