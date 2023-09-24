const superagent = require("superagent");
const Datalayer = require("chia-datalayer");
const CONFIG = require("../config");
const { logger } = require("../logger");
const wallet = require("../chia/wallet");
const { generateUriForHostAndPort } = require("../utils");

const registryUri = generateUriForHostAndPort(
  CONFIG.REGISTRY.PROTOCOL,
  CONFIG.REGISTRY.HOST,
  CONFIG.REGISTRY.PORT
);

/**
 * Appends Registry API Key to the request headers if available.
 *
 * @param {Object} [headers={}] - Optional headers to extend
 * @returns {Object} Headers with API Key added if available
 */
const maybeAppendRegistryApiKey = (headers = {}) => {
  if (CONFIG.REGISTRY.API_KEY) {
    headers["x-api-key"] = CONFIG.REGISTRY.API_KEY;
  }
  return headers;
};

/**
 * Commits staging data to the warehouse.
 *
 * @returns {Promise<Object>} The response body
 */
const commitStagingData = async () => {
  const response = await superagent
    .post(`${registryUri}/v1/staging/commit`)
    .set(maybeAppendRegistryApiKey());

  await new Promise(resolve => setTimeout(resolve, 5000)),
  await wallet.waitForAllTransactionsToConfirm(),
  await new Promise(resolve => setTimeout(resolve, 5000)),
  await waitForRegistryDataSync()

  return response.body;
};

/**
 * Cleans a unit object before updating it.
 *
 * @param {Object} unit - The unit to be updated
 * @returns {Object} The cleaned unit
 */
const cleanUnitBeforeUpdating = (unit) => {
  const cleanedUnit = { ...unit };
  ['issuance?.orgUid', 'issuanceId', 'orgUid', 'serialNumberBlock'].forEach(key => {
    delete cleanedUnit[key];
  });

  Object.keys(cleanedUnit).forEach(key => {
    if (cleanedUnit[key] === null) {
      delete cleanedUnit[key];
    }
  });

  return cleanedUnit;
};

/**
 * Updates a given unit.
 *
 * @param {Object} unit - The unit to update
 * @returns {Promise<Object>} The response body
 */
const updateUnit = async (unit) => {
  const cleanedUnit = cleanUnitBeforeUpdating(unit);
  const response = await superagent
    .put(`${registryUri}/v1/units`)
    .send(cleanedUnit)
    .set(maybeAppendRegistryApiKey({ "Content-Type": "application/json" }));

  return response?.body;
};

/**
 * Retires a given unit.
 *
 * @param {Object} unit - The unit to retire
 * @param {string} beneficiaryName - The name of the beneficiary
 * @param {string} beneficiaryAddress - The address of the beneficiary
 * @returns {Promise<Object>} The response body
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
  return await updateUnit(cleanedUnit);
};

/**
 * Gets asset unit blocks by a marketplace identifier.
 *
 * @param {string} marketplaceIdentifier - The marketplace identifier
 * @returns {Promise<Object>} The response body
 */
const getAssetUnitBlocks = async (marketplaceIdentifier) => {
  const response = await superagent
    .get(`${registryUri}/v1/units?filter=marketplaceIdentifier:${marketplaceIdentifier}:eq`)
    .set(maybeAppendRegistryApiKey());

  return response?.body;
};

/**
 * Gets the last processed block height.
 *
 * @returns {Promise<number|null>} The last processed height or null
 */
const getLastProcessedHeight = async () => {
  try {
    const homeOrgUid = await getHomeOrgUid();
    const response = await superagent
      .get(`${registryUri}/v1/organizations/metadata`)
      .query({ orgUid: homeOrgUid })
      .set(maybeAppendRegistryApiKey());

    return response.status === 200
      ? Number(response.body["meta_lastRetiredBlockHeight"] || 0)
      : null;
  } catch (error) {
    return null;
  }
};

/**
 * Gets the home organization UID.
 *
 * @returns {Promise<string|null>} The home organization UID or null
 */
const getHomeOrgUid = async () => {
  const homeOrg = await getHomeOrg();
  return homeOrg ? homeOrg.orgUid : null;
};

/**
 * Gets the home organization.
 *
 * @returns {Promise<Object|null>} The home organization or null
 */
const getHomeOrg = async () => {
  try {
    const response = await superagent
      .get(`${registryUri}/v1/organizations`)
      .set(maybeAppendRegistryApiKey());

    if (response.status !== 200) {
      throw new Error(`Received non-200 status code: ${response.status}`);
    }

    const orgArray = Object.keys(response.body).map(key => response.body[key]);
    return orgArray.find(org => org.isHome) || null;
  } catch (error) {
    return null;
  }
};

/**
 * Sets the last processed block height.
 *
 * @param {number} height - The last processed height
 * @returns {Promise<Object>} The response body
 */
const setLastProcessedHeight = async (height) => {
  await wallet.waitForAllTransactionsToConfirm(),
  await new Promise(resolve => setTimeout(resolve, 5000)),
  await waitForRegistryDataSync()

  const response = await superagent
    .post(`${registryUri}/v1/organizations/metadata`)
    .send({ lastRetiredBlockHeight: height.toString() })
    .set(maybeAppendRegistryApiKey({ "Content-Type": "application/json" }));

  const data = response.body;

  if (response.status !== 200 || data.message !== "Home org currently being updated, will be completed soon.") {
    logger.fatal(`CRITICAL ERROR: Could not set last processed height in registry.`);
    return;
  }

  await wallet.waitForAllTransactionsToConfirm(),
  await new Promise(resolve => setTimeout(resolve, 5000)),
  await waitForRegistryDataSync()

  return data;
};

/**
 * Confirms token registration on the warehouse.
 *
 * @param {number} [retry=0] - The retry count
 * @returns {Promise<boolean>} True if confirmed, false otherwise
 */
const confirmTokenRegistrationOnWarehouse = async (retry = 0) => {
  if (retry > 60) return false;

  try {
    await new Promise(resolve => setTimeout(resolve, 30000));
    const response = await superagent
      .get(`${registryUri}/v1/staging/hasPendingTransactions`)
      .set(maybeAppendRegistryApiKey());

    const thereAreNoPendingTransactions = response.body?.confirmed;
    if (thereAreNoPendingTransactions) return true;

    await new Promise(resolve => setTimeout(resolve, 30000));
    return confirmTokenRegistrationOnWarehouse(retry + 1);
  } catch (error) {
    logger.error(`Error confirming token registration on warehouse: ${error.message}`);
    return false;
  }
};

/**
 * Registers token creation on the registry.
 *
 * @param {Object} token - The token to register
 * @param {string} warehouseUnitId - The warehouse unit ID
 * @returns {Promise<Object>} The response body
 */
const registerTokenCreationOnRegistry = async (token, warehouseUnitId) => {
  try {
    await waitForRegistryDataSync();

    // Running in core registry mode, detokenization object is replaced with empty strings
    if (CONFIG.GENERAL.CORE_REGISTRY_MODE) {
      token.detokenization = { mod_hash: "", public_key: "", signature: "" };
    }

    const response = await superagent
      .post(`${registryUri}/v1/organizations/metadata`)
      .send({ [token.asset_id]: JSON.stringify(token) })
      .set(maybeAppendRegistryApiKey({ "Content-Type": "application/json" }));

    const data = response.body;
    if (data.message === "Home org currently being updated, will be completed soon.") {
      const isTokenRegistered = await confirmTokenRegistrationOnWarehouse();

      if (isTokenRegistered && CONFIG.GENERAL.CORE_REGISTRY_MODE) {
        await updateUnitMarketplaceIdentifierWithAssetId(warehouseUnitId, token.asset_id);
      }

      return response.body;
    } else {
      logger.error("Could not register token creation in registry.");
    }
  } catch (error) {
    logger.error(`Could not register token creation in registry: ${error.message}`);
  }
};

/**
 * Updates unit marketplace identifier with asset ID.
 *
 * @param {string} warehouseUnitId - The warehouse unit ID
 * @param {string} asset_id - The asset ID
 */
const updateUnitMarketplaceIdentifierWithAssetId = async (warehouseUnitId, asset_id) => {
  try {
    const unitToBeUpdatedResponse = await superagent
      .get(`${registryUri}/v1/units`)
      .query({ warehouseUnitId: warehouseUnitId })
      .set(maybeAppendRegistryApiKey());

    const unitToBeUpdated = unitToBeUpdatedResponse.body;
    unitToBeUpdated.marketplaceIdentifier = asset_id;
    unitToBeUpdated.marketplace = "Tokenized on Chia";

    ['issuance?.orgUid', 'issuanceId', 'orgUid', 'serialNumberBlock', 'unitCount', 'unitBlockStart', 'unitBlockEnd'].forEach(key => {
      delete unitToBeUpdated[key];
    });

    Object.keys(unitToBeUpdated).forEach(key => {
      if (unitToBeUpdated[key] === null) {
        delete unitToBeUpdated[key];
      }
    });

    await superagent
      .put(`${registryUri}/v1/units`)
      .send(unitToBeUpdated)
      .set(maybeAppendRegistryApiKey({ "Content-Type": "application/json" }));
  } catch (error) {
    logger.error(`Could not update unit marketplace identifier with asset id: ${error.message}`);
  }
};

/**
 * Fetches metadata for a specific organization.
 *
 * @param {string} orgUid - The unique identifier for the organization
 * @returns {Promise<Object>} The organization metadata
 */
const getOrgMetaData = async (orgUid) => {
  const url = `${registryUri}/v1/organizations/metadata?orgUid=${orgUid}`;
  const response = await superagent.get(url).set(maybeAppendRegistryApiKey());
  return response.body;
};

/**
 * Waits for the registry data to synchronize.
 *
 * @returns {Promise<void>}
 */
const waitForRegistryDataSync = async () => {
  await new Promise(resolve => setTimeout(resolve, 5000));
  const dataLayerConfig = {};

  if (CONFIG.DATA_LAYER_HOST) {
    dataLayerConfig.datalayer_host = CONFIG.DATA_LAYER_HOST;
  }
  if (CONFIG.WALLET_HOST) {
    dataLayerConfig.wallet_host = CONFIG.WALLET_HOST;
  }
  if (CONFIG.CERTIFICATE_FOLDER_PATH) {
    dataLayerConfig.certificate_folder_path = CONFIG.CERTIFICATE_FOLDER_PATH;
  }

  const datalayer = new Datalayer(dataLayerConfig);
  const homeOrg = await getHomeOrg();

  const onChainRegistryRoot = await datalayer.getRoot({ id: homeOrg.registryId });

  if (!onChainRegistryRoot.confirmed) {
    console.log("Waiting for Registry root to confirm");
    return waitForRegistryDataSync();
  }

  if (onChainRegistryRoot.hash !== homeOrg.registryHash) {
    console.log("Waiting for CADT to sync with latest regisry root.", {
      onChainRoot: onChainRegistryRoot.hash,
      homeOrgRegistryRoot: homeOrg.registryHash,
    });
    return waitForRegistryDataSync();
  }

  const onChainOrgRoot = await datalayer.getRoot({ id: homeOrg.orgUid });

  if (!onChainOrgRoot.confirmed) {
    console.log("Waiting for Organization root to confirm");
    return waitForRegistryDataSync();
  }

  if (onChainOrgRoot.hash !== homeOrg.orgHash) {
    console.log("Waiting for CADT to sync with latest organization root.", {
      onChainRoot: onChainOrgRoot.hash,
      homeOrgRoot: homeOrg.orgHash,
    });
    return waitForRegistryDataSync();
  }
};

/**
 * Gets the tokenized unit by asset ID.
 *
 * @param {string} assetId - The unique identifier for the asset
 * @returns {Promise<Object>} The tokenized unit data
 */
const getTokenizedUnitByAssetId = async (assetId) => {
  try {
    const url = `${registryUri}/v1/units?marketplaceIdentifiers=${assetId}`;
    const response = await superagent.get(url).set(maybeAppendRegistryApiKey());
    return response.body;
  } catch (error) {
    logger.error(`Could not get tokenized unit by asset id: ${error.message}`);
    throw new Error(`Could not get tokenized unit by asset id: ${error}`);
  }
};

/**
 * Gets project data by warehouse project ID.
 *
 * @param {string} warehouseProjectId - The unique identifier for the warehouse project
 * @returns {Promise<Object>} The project data
 */
const getProjectByWarehouseProjectId = async (warehouseProjectId) => {
  try {
    const url = `${registryUri}/v1/projects?projectIds=${warehouseProjectId}`;
    const response = await superagent.get(url).set(maybeAppendRegistryApiKey());
    return response.body[0];
  } catch (error) {
    logger.error(`Could not get corresponding project data: ${error.message}`);
    throw new Error(`Could not get corresponding project data: ${error}`);
  }
};


/**
 * Placeholder function for deleting staging data.
 */
const deleteStagingData = async () => {
  console.log("Not implemented");
};

module.exports = {
  commitStagingData,
  cleanUnitBeforeUpdating,
  updateUnit,
  retireUnit,
  getAssetUnitBlocks,
  getLastProcessedHeight,
  getHomeOrgUid,
  getHomeOrg,
  setLastProcessedHeight,
  registerTokenCreationOnRegistry,
  getOrgMetaData,
  deleteStagingData,
  getTokenizedUnitByAssetId,
  getProjectByWarehouseProjectId,
};
