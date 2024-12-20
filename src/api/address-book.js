const { CONFIG } = require("../config");
const { logger } = require("../logger");
const utils = require("../utils");
const superagent = require("superagent");


const registryUri = utils.generateUriForHostAndPort(
  CONFIG().CADT.PROTOCOL,
  CONFIG().CADT.HOST,
  CONFIG().CADT.PORT
);

/**
 * Appends Registry API Key to the request headers if available.
 *
 * @param {Object} [headers={}] - Optional headers to extend
 * @returns {Object} Headers with API Key added if available
 */
const maybeAppendRegistryApiKey = (headers = {}) => {
  if (CONFIG().CADT.API_KEY) {
    headers["x-api-key"] = CONFIG().CADT.API_KEY;
  }
  return headers;
};

const createAddress =  async (name, walletAddress) => {
  logger.debug(`GET ${registryUri}/v1/addressBook`);

  const postResponse = await superagent
      .post(`${registryUri}/v1/addressBook`)
      .body({ name, walletAddress })
      .set(maybeAppendRegistryApiKey());
      if (postResponse.status === 403) {
      throw new Error(
        "Registry API key is invalid, please check your config.yaml."
      );
    }
    return postResponse.body
}

module.exports = { createAddress }