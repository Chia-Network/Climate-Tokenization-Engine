const superagent = require("superagent");
const { getConfig } = require("./config-loader");

/**
 * @type {{ CADT_API_SERVER_HOST: string, CADT_API_KEY: string }}
 */
const { CADT_API_SERVER_HOST, CADT_API_KEY } = getConfig();

/**
 * Helper function to set API key header
 * @param {superagent.Request} request
 */
const setApiKeyHeader = (request) => {
  if (CADT_API_KEY) {
    request.set("x-api-key", CADT_API_KEY);
  }
};

/**
 * Commit staging data to warehouse.
 * @returns {Promise<void>}
 */
const commitStagingData = async () => {
  const request = superagent.post(
    `${CADT_API_SERVER_HOST}/v1/staging/commit`
  );
  setApiKeyHeader(request);
  await request;
  await new Promise((resolve) => setTimeout(resolve, 5000));
};

/**
 * Clean a unit object before updating.
 * @param {object} unit
 * @returns {object}
 */
const cleanUnitBeforeUpdating = (unit) => {
  const unitToBeUpdated = { ...unit };
  delete unitToBeUpdated.issuance?.orgUid;
  delete unitToBeUpdated.issuanceId;
  delete unitToBeUpdated.orgUid;
  delete unitToBeUpdated.serialNumberBlock;

  Object.keys(unitToBeUpdated).forEach(function (key) {
    if (this[key] == null) {
      delete this[key];
    }
  }, unitToBeUpdated);

  return unitToBeUpdated;
};

/**
 * Insert a unit.
 * @param {object} unit
 * @returns {Promise<void>}
 */
const insertUnit = async (unit) => {
  delete unit.warehouseUnitId;
  const request = superagent
    .post(`${CADT_API_SERVER_HOST}/v1/units`)
    .send(unit)
    .set("Content-Type", "application/json");
  setApiKeyHeader(request);
  await request;
};

/**
 * Update a given unit.
 * @param {object} unit
 * @returns {Promise<void>}
 */
const updateUnit = async (unit) => {
  const cleanedUnit = cleanUnitBeforeUpdating(unit);
  const request = superagent
    .put(`${CADT_API_SERVER_HOST}/v1/units`)
    .send(cleanedUnit)
    .set("Content-Type", "application/json");
  setApiKeyHeader(request);
  await request;
};

/**
 * Retire a given unit.
 * @param {object} unit
 * @param {string} beneficiaryName
 * @param {string} beneficiaryAddress
 * @returns {Promise<void>}
 */
const retireUnit = async (unit, beneficiaryName, beneficiaryAddress) => {
  const cleanedUnit = cleanUnitBeforeUpdating(unit);
  if (beneficiaryName) {
    cleanedUnit.unitOwner = beneficiaryName;
  }
  if (beneficiaryAddress) {
    cleanedUnit.unitStatusReason = beneficiaryAddress;
  }
  cleanedUnit.unitStatus = "Retired";
  await updateUnit(cleanedUnit);
};

/**
 * Get asset unit blocks by marketplace identifier
 * @param {string} marketplaceIdentifier
 * @returns {Promise<superagent.Response>}
 */
const getAssetUnitBlocks = async (marketplaceIdentifier) => {
  const request = superagent.get(
    `${CADT_API_SERVER_HOST}/v1/units?filter=marketplaceIdentifier:${marketplaceIdentifier}:eq`
  );
  setApiKeyHeader(request);
  return await request;
};

/**
 * Get last processed block height.
 * @returns {Promise<number>}
 */
const getLastProcessedHeight = async () => {
  const homeOrgUid = await getHomeOrgUid();
  const request = superagent
    .get(`${CADT_API_SERVER_HOST}/v1/organizations/metadata`)
    .query({ orgUid: homeOrgUid });
  setApiKeyHeader(request);
  const response = await request;
  if (response.status !== 200) {
    throw new Error(`Received non-200 status code: ${response.status}`);
  }
  return Number(response.body["meta_lastRetiredBlockHeight"] || 0);
};

/**
 * Get home organization UID.
 * @returns {Promise<string|null>}
 */
const getHomeOrgUid = async () => {
  const homeOrg = await getHomeOrg();
  return homeOrg ? homeOrg.orgUid : null;
};

/**
 * Get home organization.
 * @returns {Promise<object|null>}
 */
const getHomeOrg = async () => {
  const request = superagent.get(
    `${CADT_API_SERVER_HOST}/v1/organizations`
  );
  setApiKeyHeader(request);
  const response = await request;
  if (response.status !== 200) {
    throw new Error(`Received non-200 status code: ${response.status}`);
  }
  return response.body.find((org) => org.isHome) || null;
};

/**
 * Set last processed block height.
 * @param {number} height
 * @returns {Promise<void>}
 */
const setLastProcessedHeight = async (height) => {
  const request = superagent
    .post(`${CADT_API_SERVER_HOST}/v1/organizations/metadata`)
    .send({ lastRetiredBlockHeight: height.toString() })
    .set("Content-Type", "application/json");
  setApiKeyHeader(request);
  await request;
};

module.exports = {
  commitStagingData,
  cleanUnitBeforeUpdating,
  insertUnit,
  updateUnit,
  retireUnit,
  getAssetUnitBlocks,
  getLastProcessedHeight,
  getHomeOrgUid,
  getHomeOrg,
  setLastProcessedHeight,
};
