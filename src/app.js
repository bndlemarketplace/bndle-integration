require('dotenv').config({ path: (__dirname, '../.env') }); 
const express = require('express');
const helmet = require('helmet');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const cors = require('cors');
const passport = require('passport');
const httpStatus = require('http-status');
const jsend = require('jsend');
const config = require('./config/config');
const morgan = require('./config/morgan');
const tasks = require('./lib/jobs/cronjobs/init');
const { jwtStrategy } = require('./config/passport');
const { authLimiter } = require('./middlewares/rateLimiter');
const { errorConverter, errorHandler } = require('./middlewares/error');
const ApiError = require('./utils/ApiError');
const routes = require('./routes/routes');

const app = express();
if (config.env !== 'test') {
  app.use(morgan.successHandler);
  app.use(morgan.errorHandler);
}
app.use(jsend.middleware);

// set security HTTP headers
app.use(helmet());

// parse json request body
app.use(express.json({ limit: '50mb' }));

// parse urlencoded request body
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// parses all the bodies as string
app.use(express.text());
// sanitize request data
app.use(xss());
app.use(mongoSanitize());

// gzip compression
app.use(compression());

// enable cors
app.use(cors());
app.options('*', cors());

// jwt authentication
app.use(passport.initialize());
passport.use('jwt', jwtStrategy);

// v1 api routes
app.use('/v1', routes);

// initatlize crons
tasks.connect(tasks.agenda);
// initilize queues
require('./lib/jobs/queue/process');

// send back a 404 error for any unknown api request
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});

// convert error to ApiError, if needed
app.use(errorConverter);

// handle error
app.use(errorHandler);

module.exports = app;
