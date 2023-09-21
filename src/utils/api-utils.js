const os = require("os");
const path = require("path");
const fs = require("fs");
const { getChiaRoot } = require("chia-root-resolver");
const { getConfig } = require("../utils/config-loader");
const superagent = require("superagent");

/**
 * Configuration object
 * @type {object}
 */
let CONFIG = getConfig();

/**
 * Get base options for request.
 *
 * @returns {object} Base options object containing method, cert, key, and timeout
 */
const getBaseOptions = () => {
  const chiaRoot = getChiaRoot();
  let cert, key;

  // Check if certificates and key are provided in environment variables
  if (process.env.CHIA_CERT_BASE64 && process.env.CHIA_KEY_BASE64) {
    console.log(`Using cert and key from environment variables.`);
    cert = Buffer.from(process.env.CHIA_CERT_BASE64, "base64").toString(
      "ascii"
    );
    key = Buffer.from(process.env.CHIA_KEY_BASE64, "base64").toString("ascii");
  } else {
    let certificateFolderPath =
      CONFIG.CERTIFICATE_FOLDER_PATH || `${chiaRoot}/config/ssl`;

    // Replace "~" with home directory if it starts the path
    if (certificateFolderPath.startsWith("~")) {
      certificateFolderPath = path.join(
        os.homedir(),
        certificateFolderPath.slice(1)
      );
    }

    // Define certificate and key file paths
    const certFile = path.resolve(
      `${certificateFolderPath}/data_layer/private_data_layer.crt`
    );
    const keyFile = path.resolve(
      `${certificateFolderPath}/data_layer/private_data_layer.key`
    );

    // Read files
    cert = fs.readFileSync(certFile);
    key = fs.readFileSync(keyFile);
  }

  return {
    method: "POST",
    cert,
    key,
    timeout: 300000,
  };
};

/**
 * Adds CADT API Key to the request headers if available.
 * @param {Object} headers - Optional headers to extend
 * @returns {Object} Headers with CADT API Key added if available
 */
const addCadtApiKeyHeader = (headers = {}) => {
  if (CONFIG.CADT_API_KEY) {
    headers['x-api-key'] = CONFIG.CADT_API_KEY;
  }
  return headers;
};

/**
 * Sleeps for the given time in milliseconds.
 * @param {number} ms - Time in milliseconds to sleep
 * @returns {Promise<void>} A promise that resolves after the specified time
 */
const sleep = async (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Handles API request retries.
 * @param {Function} requestFn - Function containing the API request logic
 * @param {number} [maxRetries=3] - Maximum number of retries
 * @param {number} [retryInterval=5000] - Interval between retries in milliseconds
 * @returns {Promise<any>} A promise that resolves with the API request result
 */
const handleApiRequestWithRetries = async (requestFn, maxRetries = 3, retryInterval = 5000) => {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      return await requestFn();
    } catch (error) {
      retries += 1;
      if (retries >= maxRetries) {
        throw error;
      }
      await sleep(retryInterval);
    }
  }
};


module.exports = {
  getBaseOptions,
  addCadtApiKeyHeader,
  sleep,
  handleApiRequestWithRetries,
};
