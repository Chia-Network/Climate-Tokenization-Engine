import request from "request-promise";
import fs from "fs";
import os from "os";
import path from "path";
import https from "https";

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
      url: "https://localhost:8562/get_owned_stores",
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

export { getStoreIds };
