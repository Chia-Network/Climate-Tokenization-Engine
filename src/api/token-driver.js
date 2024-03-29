const superagent = require("superagent");
const { logger } = require("../logger");
const { CONFIG } = require("../config");

const {
  generateUriForHostAndPort,
  waitFor,
  handleApiRequestWithRetries,
} = require("../utils");

const tokenDriverUri = generateUriForHostAndPort(
  CONFIG().CHIA_CLIMATE_TOKENIZATION.PROTOCOL,
  CONFIG().CHIA_CLIMATE_TOKENIZATION.HOST,
  CONFIG().CHIA_CLIMATE_TOKENIZATION.PORT
);

/**
 * Adds Token Driver API Key to the request headers if available.
 * @param {Object} headers - Optional headers to extend
 * @returns {Object} Headers with API Key added if available
 */
const maybeAppendTokenDriverApiKey = (headers = {}) => {
  if (CONFIG().CHIA_CLIMATE_TOKENIZATION.API_KEY) {
    headers["x-api-key"] = CONFIG().CHIA_CLIMATE_TOKENIZATION.API_KEY;
  }
  return headers;
};

/**
 * @async
 * @function sendParseDetokRequest
 * @param {string} detokString - The string to be detokenized.
 * @throws Will throw an error if the request cannot be processed.
 * @return {Promise<Object>} The API response body.
 */
const sendParseDetokRequest = async (detokString) => {
  try {
    const url = `${tokenDriverUri}/v1/tokens/parse-detokenization?content=${detokString}`;

    logger.debug(`GET ${url}`);
    const response = await superagent
      .get(url)
      .set(maybeAppendTokenDriverApiKey());
    return response.body;
  } catch (error) {
    throw new Error(`Detokenize api could not process request: ${error}`);
  }
};

/**
 * Waits for confirmation of token creation.
 *
 * @param {string} transactionId - The transaction ID
 * @param {number} [retry=0] - The retry count
 * @returns {Promise<boolean>} True if confirmed, false otherwise
 */
const waitForTokenizationTransactionConfirmation = async (
  transactionId,
  retry = 0
) => {
  if (retry > 60) {
    return false;
  }

  try {
    await waitFor(30000);
    logger.debug(`GET ${tokenDriverUri}/v1/transactions/${transactionId}`);
    const response = await superagent
      .get(`${tokenDriverUri}/v1/transactions/${transactionId}`)
      .set(maybeAppendTokenDriverApiKey());

    if (response.body?.record?.confirmed) {
      return true;
    }

    await waitFor(30000);
    return waitForTokenizationTransactionConfirmation(transactionId, retry + 1);
  } catch (error) {
    logger.error(
      `Error confirming token creation: ${transactionId}, ${error.message}`
    );
    return false;
  }
};

/**
 * Confirms if detokenization has been completed.
 * @param {Object} payload - The body of the request containing details for confirmation
 * @returns {Promise<Object>} - A promise that resolves to an object containing the confirmation response.
 */
const confirmDetokanization = async (payload) => {
  try {
    const assetId = payload?.token?.asset_id;
    if (payload.unit) {
      delete payload.unit;
    }

    return handleApiRequestWithRetries(async () => {
      logger.debug(`PUT ${tokenDriverUri}/v1/tokens/${assetId}/detokenize`);
      return await superagent
        .put(`${tokenDriverUri}/v1/tokens/${assetId}/detokenize`)
        .send(payload)
        .set(
          maybeAppendTokenDriverApiKey({ "Content-Type": "application/json" })
        );
    });
  } catch (error) {
    throw new Error(`Detokenization could not be confirmed: ${error.message}`);
  }
};

/**
 * Registers a token creation event on the registry and returns a TokenCreatedResponse.
 *
 * @async
 * @function
 * @param {TokenizationBody} tokenizationBody - The request body containing token and payment details.
 * @returns {Promise<TokenCreatedResponse>} The token creation response.
 * @throws {Error} If the Token Driver API key is invalid.
 */
const createToken = async (tokenizationBody) => {
  try {
    logger.debug(`POST ${tokenDriverUri}/v1/tokens`);
    const response = await superagent
      .post(`${tokenDriverUri}/v1/tokens`)
      .send(tokenizationBody)
      .set(
        maybeAppendTokenDriverApiKey({ "Content-Type": "application/json" })
      );

    if (response.status === 403) {
      throw new Error(
        "Token Driver API key is invalid, please check your config.yaml."
      );
    }

    logger.trace(`Token creation response: ${JSON.stringify(response.body)}`);

    return response?.body;
  } catch (error) {
    logger.error(`Token creation could not be initiated: ${error.message}`);

    // Log additional information if present in the error object
    if (error.response && error.response.body) {
      logger.error(
        `Additional error details: ${JSON.stringify(error.response.body)}`
      );
    }

    return null;
  }
};

module.exports = {
  sendParseDetokRequest,
  waitForTokenizationTransactionConfirmation,
  confirmDetokanization,
  createToken,
};
