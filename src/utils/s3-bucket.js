const AWS = require('aws-sdk');
AWS.config.update({ region: 'eu-west-2' });
const fetch = require('node-fetch');
const detect = require('detect-file-type');
const config = require('../config/restifyConfig');

async function downloadImgAndUploadToS3(url) {
  let image = await fetch(url);
  let imageBuffer = Buffer.from(await image.arrayBuffer());
  let imgSplit = url.split('/');
  let imgName = imgSplit[imgSplit.length - 1];
  let imgExt;
  detect.fromBuffer(imageBuffer, function (err, ext) {
    console.log(ext);
    imgExt = ext.ext;
  });

  const location = uploadToS3(imgName, imgExt, imageBuffer);
  return location 
}

const uploadToS3 = async (imageName, imageType, imageBuffer) => {
  const s3bucket = new AWS.S3({
    params: {
      Bucket: config.bucketName,
    },
  });

  var data = {
    Key: imageName,
    Body: imageBuffer,
    ContentType: imageType,
    ACL: 'public-read',
  };

  let location;
  await s3bucket
    .upload(data)
    .promise()
    .then((response) => (location = response.Location))
    .catch((err) => console.log(err));
  console.log(location);
  return location;
};

module.exports = {
  downloadImgAndUploadToS3,
};
