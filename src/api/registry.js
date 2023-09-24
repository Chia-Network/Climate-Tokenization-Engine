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
 * Adds Registry API Key to the request headers if available.
 * @param {Object} headers - Optional headers to extend
 * @returns {Object} Headers with API Key added if available
 */
const maybeAppendRegistryApiKey = (headers = {}) => {
  if (CONFIG.REGISTRY.API_KEY) {
    headers["x-api-key"] = CONFIG.REGISTRY.API_KEY;
  }
  return headers;
};

/**
 * Commit staging data to warehouse.
 * @returns {Promise<void>}
 */
const commitStagingData = async () => {
  const request = await superagent
    .post(`${registryUri}/v1/staging/commit`)
    .set(maybeAppendRegistryApiKey());

  await new Promise((resolve) => setTimeout(resolve, 5000));
  await wallet.waitForAllTransactionsToConfirm();
  await new Promise((resolve) => setTimeout(resolve, 5000));
  await waitForRegistryDataSync();
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
 * Update a given unit.
 * @param {object} unit
 * @returns {Promise<void>}
 */
const updateUnit = async (unit) => {
  const cleanedUnit = cleanUnitBeforeUpdating(unit);
  const request = await superagent
    .put(`${registryUri}/v1/units`)
    .send(cleanedUnit)
    .set(maybeAppendRegistryApiKey({ "Content-Type": "application/json" }));
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
  const response = await superagent
    .get(
      `${registryUri}/v1/units?filter=marketplaceIdentifier:${marketplaceIdentifier}:eq`
    )
    .set(maybeAppendRegistryApiKey({ "Content-Type": "application/json" }));
  
    return response?.body;
};

/**
 * Get last processed block height.
 * @returns {Promise<number | null>}
 */
const getLastProcessedHeight = async () => {
  try {
    const homeOrgUid = await getHomeOrgUid();
    const response = await superagent
      .get(`${registryUri}/v1/organizations/metadata`)
      .query({ orgUid: homeOrgUid })
      .set(maybeAppendRegistryApiKey({ "Content-Type": "application/json" }));

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
    const response = await superagent
      .get(`${registryUri}/v1/organizations`)
      .set(maybeAppendRegistryApiKey({ "Content-Type": "application/json" }));

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
  await wallet.waitForAllTransactionsToConfirm();
  await new Promise((resolve) => setTimeout(resolve, 5000));
  await waitForRegistryDataSync();

  const response = await superagent
    .post(`${registryUri}/v1/organizations/metadata`)
    .send({ lastRetiredBlockHeight: height.toString() })
    .set(maybeAppendRegistryApiKey({ "Content-Type": "application/json" }));

  const data = response.body;

  if (
    response.status !== 200 ||
    data.message !== "Home org currently being updated, will be completed soon."
  ) {
    logger.fatal(
      `CRITICAL ERROR: Could not set last processed height in registry.`
    );
    return;
  }

  await wallet.waitForAllTransactionsToConfirm();
  await new Promise((resolve) => setTimeout(resolve, 5000));
  await waitForRegistryDataSync();
};

const registerTokenCreationOnRegistry = async (token, warehouseUnitId) => {
  try {
    await waitForRegistryDataSync();

    // When running in core registry mode, we don't want to be able to detokenize
    // We need to delete the detokenization object from the token
    // but because of validation, we need to replace it empty strings
    if (CONFIG.GENERAL.CORE_REGISTRY_MODE) {
      token.detokenization = {
        mod_hash: "",
        public_key: "",
        signature: "",
      };
    }

    const response = await superagent
      .post(`${registryUri}/v1/organizations/metadata`)
      .send({ [token.asset_id]: JSON.stringify(token) })
      .set(maybeAppendRegistryApiKey({ "Content-Type": "application/json" }));

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
    const url = `${registryUri}/v1/organizations/metadata?orgUid=${orgUid}`;
    const response = await superagent
      .get(url)
      .set(maybeAppendRegistryApiKey());
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
    const url = `${registryUri}/v1/projects?projectIds=${warehouseProjectId}`;
    const response = await superagent.get(url).set(maybeAppendRegistryApiKey());
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
    const url = `${registryUri}/v1/units?marketplaceIdentifiers=${assetId}`;
    const response = await superagent.get(url).set(maybeAppendRegistryApiKey());
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
      .post(`${registryUri}/v1/units/split`)
      .send(JSON.stringify(dataToBeSubmitted))
      .set(maybeAppendRegistryApiKey({ "Content-Type": "application/json" }));

    if (CONFIG.REGISTRY.API_KEY) {
      request.set("x-api-key", CONFIG.REGISTRY.API_KEY);
    }

    await request;
  } catch (error) {
    throw new Error(`Could not split detokenize unit on warehouse: ${error}`);
  }
};

async function waitForRegistryDataSync() {
  await new Promise((resolve) => setTimeout(() => resolve(), 5000));

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

  const onChainRegistryRoot = await datalayer.getRoot({
    id: homeOrg.registryId,
  });

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

  const onChainOrgRoot = await datalayer.getRoot({
    id: homeOrg.orgUid,
  });

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
}

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
  getProjectByWarehouseProjectId,
  getTokenizedUnitByAssetId,
  splitUnit,
  deleteStagingData,
  waitForRegistryDataSync,
};
