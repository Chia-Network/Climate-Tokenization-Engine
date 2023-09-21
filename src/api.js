const superagent = require("superagent");
const { addCadtApiKeyHeader } = require("./utils");
const CONFIG = require("./config");
const logger = require("./logger"); // Assuming you have a logger.js file

/**
 * @async
 * @function sendParseDetokRequest
 * @param {string} detokString - The string to be detokenized.
 * @throws Will throw an error if the request cannot be processed.
 * @return {Promise<Object>} The API response body.
 */
async function sendParseDetokRequest(detokString) {
  try {
    const url = `${CONFIG.CLIMATE_TOKENIZATION_CHIA_HOST}/v1/tokens/parse-detokenization?content=${detokString}`;
    const response = await superagent.get(url);
    return response.body;
  } catch (error) {
    throw new Error(`Detokenize api could not process request: ${error}`);
  }
}

/**
 * @async
 * @function getOrgMetaData
 * @param {string} orgUid - The unique identifier for the organization.
 * @throws Will throw an error if metadata cannot be fetched.
 * @return {Promise<Object>} The organization metadata.
 */
async function getOrgMetaData(orgUid) {
  try {
    const url = `${CONFIG.CADT_API_SERVER_HOST}/v1/organizations/metadata?orgUid=${orgUid}`;
    const response = await superagent.get(url).set(addCadtApiKeyHeader());
    return response.body;
  } catch (error) {
    logger.error(`Could not get org meta data: ${error.message}`);
    throw new Error(`Could not get org meta data: ${error}`);
  }
}

/**
 * @async
 * @function getProjectByWarehouseProjectId
 * @param {string} warehouseProjectId - The unique identifier for the warehouse project.
 * @throws Will throw an error if project data cannot be fetched.
 * @return {Promise<Object>} The project data.
 */
async function getProjectByWarehouseProjectId(warehouseProjectId) {
  try {
    const url = `${CONFIG.CADT_API_SERVER_HOST}/v1/projects?projectIds=${warehouseProjectId}`;
    const response = await superagent.get(url).set(addCadtApiKeyHeader());
    return response.body[0];
  } catch (error) {
    logger.error(`Could not get corresponding project data: ${error.message}`);
    throw new Error(`Could not get corresponding project data: ${error}`);
  }
}

/**
 * @async
 * @function getTokenizedUnitByAssetId
 * @param {string} assetId - The unique identifier for the asset.
 * @throws Will throw an error if unit data cannot be fetched.
 * @return {Promise<Object>} The tokenized unit data.
 */
async function getTokenizedUnitByAssetId(assetId) {
  try {
    const url = `${CONFIG.CADT_API_SERVER_HOST}/v1/units?marketplaceIdentifiers=${assetId}`;
    const response = await superagent.get(url).set(addCadtApiKeyHeader());
    return response.body;
  } catch (error) {
    logger.error(`Could not get tokenized unit by asset id. ${error.message}`);
    throw new Error(`Could not get tokenized unit by asset id. ${error}`);
  }
}

module.exports = {
  sendParseDetokRequest,
  getOrgMetaData,
  getProjectByWarehouseProjectId,
  getTokenizedUnitByAssetId,
};
