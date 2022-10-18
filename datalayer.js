const request = require("request-promise");
const fs = require("fs");
const os = require("os");
const path = require("path");
const https = require("https");

const { getConfig } = require("./utils/config-loader");
const CONFIG = getConfig();

const getBaseOptions = () => {
  const homeDir = os.homedir();

  const certFile = path.resolve(
    `${homeDir}/.chia/mainnet/config/ssl/data_layer/private_data_layer.crt`
  );

  const keyFile = path.resolve(
    `${homeDir}/.chia/mainnet/config/ssl/data_layer/private_data_layer.key`
  );

  const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
  });

  const baseOptions = {
    method: "POST",
    cert: fs.readFileSync(certFile),
    key: fs.readFileSync(keyFile),
    timeout: 60000,
    agent: httpsAgent,
  };

  return baseOptions;
};

const getStoreIds = async (orgUid) => {
  try {
    const baseOptions = getBaseOptions();

    const fetchOptions = {
      ...baseOptions,
      url: `${CONFIG.DATA_LAYER_HOST}/get_owned_stores`,
      method: "post",
      body: JSON.stringify({
        id: orgUid,
      }),
      headers: { "Content-Type": "application/json" },
    };

    const response = await request(fetchOptions);

    const data = JSON.parse(response);

    if (data.success) {
      return data.store_ids;
    }

    throw new Error(data.error);
  } catch (error) {
    throw new Error(error);
  }
};

module.exports = { getStoreIds };
