/* eslint-disable no-async-promise-executor */
const AWS = require('aws-sdk');

const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, BUCKET_NAME } = process.env;
AWS.config.update({
  // accessKeyId: AWS_ACCESS_KEY_ID,
  // secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: AWS_REGION,
});
const s3 = new AWS.S3({
  region: AWS_REGION,
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  signatureVersion: 'v4',
});

exports.getSignedUrl = async (name, type) => {
  return new Promise(async (resolve, reject) => {
    const fileParams = {
      Bucket: BUCKET_NAME,
      Key: name,
      Expires: 600,
      ContentType: type,
      ACL: 'public-read',
    };
    try {
      const url = await s3.getSignedUrlPromise('putObject', fileParams);
      return resolve({ url });
    } catch (error) {
      return reject(error.message);
    }
  });
};
