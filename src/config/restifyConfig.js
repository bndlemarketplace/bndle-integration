module.exports = {
  name: process.env.APP_NAME || 'App',
  version: process.env.APP_VERSION || '0.0.1',
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 9001,
  locationId: process.env.SHOPIFY_LOCATION_ID,
  shopifyConfig: {
    shopName: process.env.SHOPIFY_SHOPE_NAME,
    accessToken: process.env.SHOPIFY_ACCESS_TOKEN,
    apiVersion: '2022-10',
  },
  mongoose: {
    url: process.env.MONGODB_URL,
    options: {
      useCreateIndex: true,
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: true,
    },
  },
  s3Url: process.env.s3Url,
  jwt: {
    secret: process.env.JWT_SECRET,
    accessExpirationMinutes: process.env.JWT_ACCESS_EXPIRATION_MINUTES,
    refreshExpirationDays: process.env.JWT_REFRESH_EXPIRATION_DAYS,
    resetPasswordExpirationMinutes: process.env.JWT_RESET_PASSWORD_EXPIRATION_MINUTES,
    verifyEmailExpirationMinutes: process.env.JWT_VERIFY_EMAIL_EXPIRATION_MINUTES,
    verifyOTPExpirationMinutes: process.env.JWT_VERIFY_OTP_EXPIRATION_MINUTES,
  },
  mode: process.env.SERVER_MODE,
  bucketName: process.env.BUCKET_NAME,
};

// console.log(process.env.JWT_SECRET, '++++++++++++++++++++++++++');
