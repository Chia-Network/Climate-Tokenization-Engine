const superagent = require("superagent");
const CONFIG = require("../config");
const { logger } = require("../logger");

const { generateUriForHostAndPort } = require("../utils");

const retirementExplorerUri = generateUriForHostAndPort(
  CONFIG.REGISTRY.PROTOCOL,
  CONFIG.REGISTRY.HOST,
  CONFIG.REGISTRY.PORT
);

/**
 * Helper function to set API key header
 * @param {superagent.Request} request
 */
const setApiKeyHeader = (request) => {
  if (CONFIG.REGISTRY.API_KEY) {
    request.set("x-api-key", CONFIG.REGISTRY.API_KEY);
  }
};

/**
 * Commit staging data to warehouse.
 * @returns {Promise<void>}
 */
const commitStagingData = async () => {
  const request = superagent.post(`${retirementExplorerUri}/v1/staging/commit`);
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
    .put(`${retirementExplorerUri}/v1/units`)
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
    `${retirementExplorerUri}/v1/units?filter=marketplaceIdentifier:${marketplaceIdentifier}:eq`
  );
  setApiKeyHeader(request);
  return await request;
};

/**
 * Get last processed block height.
 * @returns {Promise<number | null>}
 */
const getLastProcessedHeight = async () => {
  try {
    const homeOrgUid = await getHomeOrgUid();
    const response = await superagent
      .get(`${retirementExplorerUri}/v1/organizations/metadata`)
      .query({ orgUid: homeOrgUid });

    setApiKeyHeader(response);

    return response.status === 200
      ? Number(response.body["meta_lastRetiredBlockHeight"] || 0)
      : null;
  } catch (error) {
    return null;
  }
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
  try {
    const request = superagent.get(`${retirementExplorerUri}/v1/organizations`);
    setApiKeyHeader(request);
    const response = await request;

    if (response.status !== 200) {
      throw new Error(`Received non-200 status code: ${response.status}`);
    }

    const orgArray = Object.keys(response.body).map(
      (key) => response.body[key]
    );

    return orgArray.find((org) => org.isHome) || null;
  } catch (error) {
    return null;
  }
};

/**
 * Set last processed block height.
 * @param {number} height
 * @returns {Promise<void>}
 */
const setLastProcessedHeight = async (height) => {
  const request = superagent
    .post(`${retirementExplorerUri}/v1/organizations/metadata`)
    .send({ lastRetiredBlockHeight: height.toString() })
    .set("Content-Type", "application/json");
  setApiKeyHeader(request);
  await request;
};

const registerTokenCreationOnRegistry = async (token, warehouseUnitId) => {
  try {
    if (CONFIG.GENERAL.CORE_REGISTRY_MODE) {
      token.detokenization = {
        mod_hash: "",
        public_key: "",
        signature: "",
      };
    }

    const response = await superagent
      .post(`${retirementExplorerUri}/v1/organizations/metadata`)
      .send({ [token.asset_id]: JSON.stringify(token) })
      .set(addCadtApiKeyHeader({ "Content-Type": "application/json" }));

    const data = response.body;

    if (
      data.message ===
      "Home org currently being updated, will be completed soon."
    ) {
      const isTokenRegistered = await confirmTokenRegistrationOnWarehouse();

      if (isTokenRegistered && CONFIG.GENERAL.CORE_REGISTRY_MODE) {
        await updateUnitMarketplaceIdentifierWithAssetId(
          warehouseUnitId,
          token.asset_id
        );
      }
    } else {
      logger.error("Could not register token creation in registry.");
    }
  } catch (error) {
    logger.error(
      `Could not register token creation in registry: ${error.message}`
    );
  }
};

/**
 * @async
 * @function getOrgMetaData
 * @param {string} orgUid - The unique identifier for the organization.
 * @throws Will throw an error if metadata cannot be fetched.
 * @return {Promise<Object>} The organization metadata.
 */
async function getOrgMetaData(orgUid) {
  try {
    const url = `${retirementExplorerUri}/v1/organizations/metadata?orgUid=${orgUid}`;
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
    const url = `${retirementExplorerUri}/v1/projects?projectIds=${warehouseProjectId}`;
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
    const url = `${retirementExplorerUri}/v1/units?marketplaceIdentifiers=${assetId}`;
    const response = await superagent.get(url).set(addCadtApiKeyHeader());
    return response.body;
  } catch (error) {
    logger.error(`Could not get tokenized unit by asset id. ${error.message}`);
    throw new Error(`Could not get tokenized unit by asset id. ${error}`);
  }
}

const splitUnit = async ({
  unit,
  amount,
  beneficiaryName,
  beneficiaryAddress,
}) => {
  console.log(
    "Splitting unit",
    JSON.stringify({
      amount,
      beneficiaryName,
      beneficiaryAddress,
    })
  );

  // Parse the serialNumberBlock
  const { unitBlockStart, unitBlockEnd } = parseSerialNumber(
    unit.serialNumberBlock
  );

  if (!unitBlockStart && !unitBlockEnd) {
    console.error("serialNumberBlock is not in the correct format");
    return;
  }

  const totalUnits = parseInt(unitBlockEnd) - parseInt(unitBlockStart) + 1;

  if (amount >= totalUnits) {
    throw new Error("Amount must be less than total units in the block");
  }

  const dataToBeSubmitted = {
    warehouseUnitId: unit.warehouseUnitId,
    records: [
      {
        unitCount: amount,
        marketplace: unit.marketplace,
        marketplaceIdentifier: unit.marketplaceIdentifier,
        unitStatus: "Retired",
        unitOwner: beneficiaryName,
        unitStatusReason: beneficiaryAddress,
      },
      {
        unitCount: totalUnits - amount,
        marketplace: unit.marketplace,
        marketplaceIdentifier: unit.marketplaceIdentifier,
      },
    ],
  };

  try {
    const request = superagent
      .post(`${retirementExplorerUri}/v1/units/split`)
      .send(JSON.stringify(dataToBeSubmitted))
      .set("Content-Type", "application/json");

    if (CONFIG.REGISTRY.API_KEY) {
      request.set("x-api-key", CONFIG.REGISTRY.API_KEY);
    }

    await request;
  } catch (error) {
    throw new Error(`Could not split detokenize unit on warehouse: ${error}`);
  }
};

const deleteStagingData = async () => {
  console.log("Not implemented");
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
  registerTokenCreationOnRegistry,
  getOrgMetaData,
  getProjectByWarehouseProjectId,
  getTokenizedUnitByAssetId,
  splitUnit,
  deleteStagingData,
};
