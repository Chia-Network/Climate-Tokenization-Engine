const os = require("os");
const path = require("path");
const fs = require("fs");
const { getChiaRoot } = require("chia-root-resolver");
const { logger } = require("../logger");
const { CONFIG } = require("../config");

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
      CONFIG?.GENERAL?.CERTIFICATE_FOLDER_PATH || `${chiaRoot}/config/ssl`;

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

module.exports = {
  getBaseRpcOptions,
};
