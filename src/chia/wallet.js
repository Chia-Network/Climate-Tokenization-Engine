const superagent = require("superagent");
const https = require("https");
const { getBaseRpcOptions } = require("./rpc");
const { CONFIG } = require("../config");
const { logger } = require("../logger");

const { WALLET_HOST, ALLOW_SELF_SIGNED_CERTIFICATES } = CONFIG().CHIA;

const walletIsSynced = async () => {
  try {
    const { cert, key, timeout } = getBaseRpcOptions();

    logger.debug(`POST ${WALLET_HOST}/get_sync_status`);
    const response = await superagent
      .post(`${WALLET_HOST}/get_sync_status`)
      .send({})
      .key(key)
      .cert(cert)
      .timeout(timeout)
      .agent(
        new https.Agent({ rejectUnauthorized: !ALLOW_SELF_SIGNED_CERTIFICATES })
      );

    const data = JSON.parse(response.text);

    if (data.success) {
      return data.synced;
    }

    return false;
  } catch (error) {
    return false;
  }
};

const walletIsAvailable = async () => {
  return await walletIsSynced();
};

const waitForAllTransactionsToConfirm = async () => {
  if (process.env.NODE_ENV === "test") {
    return true;
  }
  
  await new Promise((resolve) => setTimeout(() => resolve(), 5000));
  const unconfirmedTransactions = await hasUnconfirmedTransactions();

  if (unconfirmedTransactions) {
    await new Promise((resolve) => setTimeout(() => resolve(), 15000));
    return waitForAllTransactionsToConfirm();
  }

  return true;
};

const hasUnconfirmedTransactions = async (options) => {
  const { cert, key, timeout } = getBaseRpcOptions();

  logger.debug(`POST ${WALLET_HOST}/get_transactions`);
  const response = await superagent
    .post(`${WALLET_HOST}/get_transactions`)
    .send({
      wallet_id: options?.walletId || 1,
      sort_key: "RELEVANCE",
    })
    .key(key)
    .cert(cert)
    .timeout(timeout)
    .agent(new https.Agent({ rejectUnauthorized: false }));

  const data = JSON.parse(response.text);

  if (data.success) {
    const unconfirmedTransactions = data.transactions.some(
      (transaction) => !transaction.confirmed
    );

    if (unconfirmedTransactions) {
      console.log("Wallet has pending transactions");
    }

    return unconfirmedTransactions;
  }

  return false;
};

module.exports = {
  walletIsSynced,
  walletIsAvailable,
  waitForAllTransactionsToConfirm,
  hasUnconfirmedTransactions,
};
