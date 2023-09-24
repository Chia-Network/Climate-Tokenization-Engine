const os = require("os");
const path = require("path");
const fs = require("fs");
const { getChiaRoot } = require("chia-root-resolver");
const { logger } = require("../logger");
const CONFIG = require('../config')

/**
 * Get base options for request.
 *
 * @returns {object} Base options object containing method, cert, key, and timeout
 */
const getBaseRpcOptions = () => {
  const chiaRoot = getChiaRoot();
  let cert, key;

  // Check if certificates and key are provided in environment variables
  if (process.env.CHIA_CERT_BASE64 && process.env.CHIA_KEY_BASE64) {
    logger.info(`Using cert and key from environment variables.`);
    cert = Buffer.from(process.env.CHIA_CERT_BASE64, "base64").toString(
      "ascii"
    );
    key = Buffer.from(process.env.CHIA_KEY_BASE64, "base64").toString("ascii");
  } else {
    let certificateFolderPath =
      CONFIG.GENRAL.CERTIFICATE_FOLDER_PATH || `${chiaRoot}/config/ssl`;

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

/**
 * Generate a URI for a given host and optional port, using the specified protocol.
 * @param {string} protocol - The protocol (e.g., 'http', 'https').
 * @param {string} host - The host (e.g., 'example.com').
 * @param {number | undefined} port - The optional port number.
 * @returns {string} The generated URI.
 */
function generateUriForHostAndPort(protocol, host, port) {
  let hostUri = `${protocol}://${host}`;
  if (port) {
    hostUri += `:${port}`;
  }
  return hostUri;
}


module.exports = {
  getBaseRpcOptions,
  maybeAppendRegistryApiKey,
  sleep,
  handleApiRequestWithRetries,
  generateUriForHostAndPort,
};
