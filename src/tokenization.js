const superagent = require("superagent");
const CONFIG = require("./config");
const logger = require("./logger");
const { sleep, handleApiRequestWithRetries } = require("./utils");

/**
 * Confirms if the token creation has been completed with a given transaction ID.
 * @param {string} token - The token
 * @param {string} transactionId - The transaction ID
 * @param {number} retry - The current retry count (initially 0)
 * @returns {Promise<boolean>} - A promise that resolves to a boolean indicating whether token creation is confirmed.
 */
const confirmTokenCreationWithTransactionId = async (
  token,
  transactionId,
  retry = 0
) => {
  if (retry <= 60) {
    try {
      await sleep(30000);
      const response = await superagent.get(
        `${CONFIG.CLIMATE_TOKENIZATION_CHIA_HOST}/v1/transactions/${transactionId}`
      );
      const isTokenCreationConfirmed = response.body?.record?.confirmed;

      if (isTokenCreationConfirmed) {
        return true;
      } else {
        await sleep(30000);
        return confirmTokenCreationWithTransactionId(
          token,
          transactionId,
          retry + 1
        );
      }
    } catch (error) {
      logger.error(
        `Error confirming token creation with transaction ID ${transactionId}: ${error.message}`
      );
      return false;
    }
  }
  return false;
};

/**
 * Sends a request to parse detokenization content.
 * @param {string} detokString - The detokenization string to parse
 * @returns {Promise<Object>} - A promise that resolves to an object containing the parsed data.
 */
const sendParseDetokRequest = async (detokString) => {
  try {
    const url = `${CONFIG.CLIMATE_TOKENIZATION_CHIA_HOST}/v1/tokens/parse-detokenization?content=${detokString}`;
    return (await superagent.get(url)).body;
  } catch (error) {
    throw new Error(`Detokenize API could not process request: ${error}`);
  }
};

/**
 * Confirms if detokenization has been completed.
 * @param {Object} requestBody - The body of the request containing details for confirmation
 * @returns {Promise<Object>} - A promise that resolves to an object containing the confirmation response.
 */
const confirmDetokanization = async (requestBody) => {
  try {
    const assetId = requestBody?.token?.asset_id;
    if (requestBody.unit) {
      delete requestBody.unit;
    }

    return handleApiRequestWithRetries(async () => {
      return await superagent
        .put(
          `${CONFIG.CLIMATE_TOKENIZATION_CHIA_HOST}/v1/tokens/${assetId}/detokenize`
        )
        .send(requestBody)
        .set({ "Content-Type": "application/json" });
    });
  } catch (error) {
    throw new Error(`Detokenization could not be confirmed: ${error.message}`);
  }
};

module.exports = {
  confirmTokenCreationWithTransactionId,
  sendParseDetokRequest,
  confirmDetokanization,
};
