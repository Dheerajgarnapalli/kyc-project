const { Storage } = require("@google-cloud/storage");

const storage = new Storage();

const bucketName = "kyc-documents-team14";

const bucket = storage.bucket(bucketName);

module.exports = bucket;