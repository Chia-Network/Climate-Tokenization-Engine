const superagent = require("superagent");
const fs = require("fs");
const path = require("path");
const https = require("https");

const { getConfig, getChiaRoot } = require("./utils/config-loader");
const CONFIG = getConfig();

const getBaseOptions = () => {
  const chiaRoot = getChiaRoot();

  const certFile = path.resolve(
    `${chiaRoot}/config/ssl/data_layer/private_data_layer.crt`
  );

  const keyFile = path.resolve(
    `${chiaRoot}/config/ssl/data_layer/private_data_layer.key`
  );

  const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
  });

  return {
    cert: fs.readFileSync(certFile),
    key: fs.readFileSync(keyFile),
    agent: httpsAgent,
    timeout: 300000,
  };
};

const getStoreIds = async (orgUid) => {
  try {
    const baseOptions = getBaseOptions();

    const response = await superagent
      .post(`${CONFIG.DATA_LAYER_HOST}/get_owned_stores`)
      .send({ id: orgUid })
      .set({ "Content-Type": "application/json" })
      .agent(baseOptions.agent)
      .key(baseOptions.key)
      .cert(baseOptions.cert)
      .timeout(timeout);

    const data = response.body;

    if (data.success) {
      return data.store_ids;
    }

    throw new Error(data.error);
  } catch (error) {
    throw new Error(error);
  }
};

module.exports = { getStoreIds };
