const superagent = require("superagent");
const Datalayer = require("chia-datalayer");
const { CONFIG } = require("../config");
const { logger } = require("../logger");
const wallet = require("../chia/wallet");
const utils = require("../utils");
const constants = require("../constants.js");
const { Mutex } = require("async-mutex");

const mutex = new Mutex();

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

/**
 * Commits staging data to the warehouse.
 *
 * @returns {Promise<Object>} The response body
 */
const commitStagingData = async () => {
  try {
    const response = await superagent
      .post(`${registryUri}/v1/staging/commit`)
      .set(maybeAppendRegistryApiKey());

    await utils.waitFor(5000);
    await wallet.waitForAllTransactionsToConfirm();
    await utils.waitFor(5000);
    await waitForRegistryDataSync();

    return response.body;
  } catch (error) {
    logger.error(`Could not commit staging data: ${error.message}`);

    // Log additional information if present in the error object
    if (error.response && error.response.body) {
      logger.error(
        `Additional error details: ${JSON.stringify(error.response.body)}`
      );
    }

    return null;
  }
};

/**
 * Cleans a unit object before updating it.
 *
 * @param {Object} unit - The unit to be updated
 * @returns {Object} The cleaned unit
 */
const sanitizeUnitForUpdate = (unit) => {
  const cleanedUnit = { ...unit };

  delete cleanedUnit?.issuance?.orgUid;
  delete cleanedUnit.issuanceId;
  delete cleanedUnit.orgUid;
  delete cleanedUnit.serialNumberBlock;

  Object.keys(cleanedUnit).forEach((key) => {
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
  try {
    const cleanedUnit = sanitizeUnitForUpdate(unit);
    const response = await superagent
      .put(`${registryUri}/v1/units`)
      .send(cleanedUnit)
      .set(maybeAppendRegistryApiKey({ "Content-Type": "application/json" }));

    if (response.status === 403) {
      throw new Error(
        "Registry API key is invalid, please check your config.yaml."
      );
    }

    return response?.body;
  } catch (error) {
    logger.error(`Could not update unit: ${error.message}`);

    // Log additional information if present in the error object
    if (error.response && error.response.body) {
      logger.error(
        `Additional error details: ${JSON.stringify(error.response.body)}`
      );
    }

    return null;
  }
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
  const cleanedUnit = sanitizeUnitForUpdate(unit);
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
  try {
    const response = await superagent
      .get(
        `${registryUri}/v1/units?filter=marketplaceIdentifier:${marketplaceIdentifier}:eq`
      )
      .set(maybeAppendRegistryApiKey());

    if (response.status === 403) {
      throw new Error(
        "Registry API key is invalid, please check your config.yaml."
      );
    }

    return response?.body;
  } catch (error) {
    logger.error(
      `Could not get asset unit blocks from registry: ${error.message}`
    );

    // Log additional information if present in the error object
    if (error.response && error.response.body) {
      logger.error(
        `Additional error details: ${JSON.stringify(error.response.body)}`
      );
    }

    return null;
  }
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

    if (response.status === 403) {
      throw new Error(
        "Registry API key is invalid, please check your config.yaml."
      );
    }

    return response.status === 200
      ? Number(response.body["meta_lastRetiredBlockHeight"] || 0)
      : null;
  } catch (error) {
    logger.error(`Could not get last processed height: ${error.message}`);

    // Log additional information if present in the error object
    if (error.response && error.response.body) {
      logger.error(
        `Additional error details: ${JSON.stringify(error.response.body)}`
      );
    }

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

    if (response.status === 403) {
      throw new Error(
        "Registry API key is invalid, please check your config.yaml."
      );
    }

    if (response.status !== 200) {
      throw new Error(`Received non-200 status code: ${response.status}`);
    }

    const orgArray = Object.keys(response.body).map(
      (key) => response.body[key]
    );

    return orgArray.find((org) => org.isHome) || null;
  } catch (error) {
    logger.error(`Could not get home org: ${error.message}`);

    // Log additional information if present in the error object
    if (error.response && error.response.body) {
      logger.error(
        `Additional error details: ${JSON.stringify(error.response.body)}`
      );
    }

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
  try {
    await wallet.waitForAllTransactionsToConfirm();
    await utils.waitFor(5000);
    await waitForRegistryDataSync();

    const response = await superagent
      .post(`${registryUri}/v1/organizations/metadata`)
      .send({ lastRetiredBlockHeight: height.toString() })
      .set(maybeAppendRegistryApiKey({ "Content-Type": "application/json" }));

    if (response.status === 403) {
      throw new Error(
        "Registry API key is invalid, please check your config.yaml."
      );
    }

    const data = response.body;

    if (
      response.status !== 200 ||
      data.message !==
        "Home org currently being updated, will be completed soon."
    ) {
      logger.fatal(
        `CRITICAL ERROR: Could not set last processed height in registry.`
      );
      return;
    }

    await wallet.waitForAllTransactionsToConfirm();
    await utils.waitFor(5000);
    await waitForRegistryDataSync();

    return data;
  } catch (error) {
    logger.error(`Could not set last processed height: ${error.message}`);

    // Log additional information if present in the error object
    if (error.response && error.response.body) {
      logger.error(
        `Additional error details: ${JSON.stringify(error.response.body)}`
      );
      logger.error(`Additional error details: ${JSON.stringify(error)}`);
    }

    return null;
  }
};

/**
 * Confirms token registration on the warehouse.
 *
 * @async
 * @function
 * @param {number} [retry=0] - The retry count.
 * @returns {Promise<boolean>} Returns a Promise that resolves to true if the token registration is confirmed, or false otherwise.
 * @throws {Error} Throws an error if the Registry API key is invalid.
 */
const confirmTokenRegistrationOnWarehouse = async (retry = 0) => {
  if (process.env.NODE_ENV === "test") {
    return true;
  }

  if (retry > 60) return false;

  try {
    await utils.waitFor(30000);

    const response = await superagent
      .get(`${registryUri}/v1/staging/hasPendingTransactions`)
      .set(maybeAppendRegistryApiKey());

    if (response.status === 403) {
      throw new Error(
        "Registry API key is invalid, please check your config.yaml."
      );
    }

    if (response.body?.confirmed) return true;

    await utils.waitFor(30000);
    return confirmTokenRegistrationOnWarehouse(retry + 1);
  } catch (error) {
    logger.error(
      `Error confirming token registration on registry: ${error.message}`
    );

    if (error.response?.body) {
      logger.error(
        `Additional error details: ${JSON.stringify(error.response.body)}`
      );
    }

    return false;
  }
};

/**
 * Registers token creation on the registry.
 *
 * @async
 * @function
 * @param {Object} token - The token to register.
 * @param {string} warehouseUnitId - The warehouse unit ID.
 * @returns {Promise<Object|null>} Returns a Promise that resolves to the response body if successful, or null if an error occurs.
 * @throws {Error} Throws an error if the Registry API key is invalid.
 */
const registerTokenCreationOnRegistry = async (token, warehouseUnitId) => {
  try {
    await waitForRegistryDataSync();

    if (CONFIG().GENERAL.CORE_REGISTRY_MODE) {
      token.detokenization = { mod_hash: "", public_key: "", signature: "" };
    }

    const response = await superagent
      .post(`${registryUri}/v1/organizations/metadata`)
      .send({ [token.asset_id]: JSON.stringify(token) })
      .set(maybeAppendRegistryApiKey({ "Content-Type": "application/json" }));

    if (response.status === 403) {
      throw new Error(
        "Registry API key is invalid, please check your config.yaml."
      );
    }

    if (
      response.body.message ===
      "Home org currently being updated, will be completed soon."
    ) {
      if (
        CONFIG().GENERAL.CORE_REGISTRY_MODE &&
        (await confirmTokenRegistrationOnWarehouse())
      ) {
        await updateUnitMarketplaceIdentifierWithAssetId(
          warehouseUnitId,
          token.asset_id
        );
      }
    } else {
      logger.error("Could not register token creation in registry.");
    }

    return response.body;
  } catch (error) {
    logger.error(
      `Could not register token creation in registry: ${error.message}`
    );
    if (error.response?.body) {
      logger.error(
        `Additional error details: ${JSON.stringify(error.response.body)}`
      );
    }
    return null;
  }
};

/**
 * Updates the marketplace identifier of a unit with an asset ID.
 *
 * @async
 * @function
 * @param {string} warehouseUnitId - The warehouse unit ID to be updated.
 * @param {string} asset_id - The new asset ID to be set as marketplace identifier.
 * @returns {Promise<Object|null>} Returns a Promise that resolves to the updated unit data if successful, or null if an error occurs.
 * @throws {Error} Throws an error if the Registry API key is invalid.
 */
const updateUnitMarketplaceIdentifierWithAssetId = async (
  warehouseUnitId,
  asset_id
) => {
  try {
    const getResponse = await superagent
      .get(`${registryUri}/v1/units`)
      .query({ warehouseUnitId })
      .set(maybeAppendRegistryApiKey());

    if (getResponse.status === 403) {
      throw new Error(
        "Registry API key is invalid, please check your config.yaml."
      );
    }

    const unit = {
      ...sanitizeUnitForUpdate(getResponse.body),
      marketplaceIdentifier: asset_id,
      marketplace: "Tokenized on Chia",
    };

    const putResponse = await superagent
      .put(`${registryUri}/v1/units`)
      .send(unit)
      .set(maybeAppendRegistryApiKey({ "Content-Type": "application/json" }));

    if (putResponse.status === 403) {
      throw new Error(
        "Registry API key is invalid, please check your config.yaml."
      );
    }

    await commitStagingData();
    await utils.waitFor(5000);
    await wallet.waitForAllTransactionsToConfirm();
    await utils.waitFor(5000);
    await waitForRegistryDataSync();

    return putResponse?.body;
  } catch (error) {
    logger.error(
      `Could not update unit marketplace identifier with asset id: ${error.message}`
    );

    if (error.response?.body) {
      logger.error(
        `Additional error details: ${JSON.stringify(error.response.body)}`
      );
    }

    return null;
  }
};

/**
 * Fetches metadata for a specific organization.
 *
 * @param {string} orgUid - The unique identifier for the organization
 * @returns {Promise<Object>} The organization metadata
 */
const getOrgMetaData = async (orgUid) => {
  try {
    const url = `${registryUri}/v1/organizations/metadata?orgUid=${orgUid}`;
    const response = await superagent.get(url).set(maybeAppendRegistryApiKey());

    if (response.status === 403) {
      throw new Error(
        "Registry API key is invalid, please check your config.yaml."
      );
    }

    return response.body;
  } catch (error) {
    logger.error(`Could not get org metadata: ${error.message}`);

    // Log additional information if present in the error object
    if (error.response && error.response.body) {
      logger.error(
        `Additional error details: ${JSON.stringify(error.response.body)}`
      );
    }

    throw new Error(`Could not get org metadata: ${error}`);
  }
};

/**
 * Waits for the registry data to synchronize.
 *
 * @param {object} [options] - Function options.
 * @param {boolean} [options.throwOnEmptyRegistry=false] - Flag to throw error on empty registry.
 * @returns {Promise<void>}
 */
const waitForRegistryDataSync = async (options = {}) => {
  await mutex.waitForUnlock();

  if (!mutex.isLocked()) {
    const releaseMutex = await mutex.acquire();
    try {
      const opts = { throwOnEmptyRegistry: false, ...options };

      if (process.env.NODE_ENV === "test") {
        return;
      }

      while (true) {
        await utils.waitFor(5000);

        const config = CONFIG().CHIA;
        const dataLayerConfig = {
          datalayer_host: config.DATALAYER_HOST,
          wallet_host: config.WALLET_HOST,
          certificate_folder_path: config.CERTIFICATE_FOLDER_PATH,
          allowUnverifiedCert: config.ALLOW_SELF_SIGNED_CERTIFICATES,
        };

        const datalayer = new Datalayer(dataLayerConfig);
        const homeOrg = await getHomeOrg();

        if (!homeOrg) {
          logger.warn(
            "Cannot find the home org from the Registry. Please verify your Registry is running and you have created a Home Organization."
          );
          continue;
        }

        const onChainRegistryRoot = await datalayer.getRoot({
          id: homeOrg.registryId,
        });

        if (!onChainRegistryRoot.confirmed) {
          console.log("Waiting for Registry root to confirm");
          continue;
        }

        if (
          onChainRegistryRoot.hash === constants.emptySingletonHash &&
          opts.throwOnEmptyRegistry
        ) {
          throw new Error(
            "Registry is empty. Please add some data to run auto retirement task."
          );
        }

        if (onChainRegistryRoot.hash !== homeOrg.registryHash) {
          console.log(
            "Waiting for Registry to sync with latest registry root.",
            {
              onChainRoot: onChainRegistryRoot.hash,
              homeOrgRegistryRoot: homeOrg.registryHash,
            }
          );
          continue;
        }

        const onChainOrgRoot = await datalayer.getRoot({ id: homeOrg.orgUid });

        if (!onChainOrgRoot.confirmed) {
          console.log("Waiting for Organization root to confirm");
          continue;
        }

        if (onChainOrgRoot.hash !== homeOrg.orgHash) {
          console.log(
            "Waiting for Registry to sync with latest organization root.",
            {
              onChainRoot: onChainOrgRoot.hash,
              homeOrgRoot: homeOrg.orgHash,
            }
          );
          continue;
        }

        // Exit the loop if all conditions are met
        break;
      }
    } finally {
      releaseMutex();
    }
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

    if (response.status === 403) {
      throw new Error(
        "Registry API key is invalid, please check your config.yaml."
      );
    }

    return response.body;
  } catch (error) {
    logger.error(`Could not get tokenized unit by asset id: ${error.message}`);

    // Log additional information if present in the error object
    if (error.response && error.response.body) {
      logger.error(
        `Additional error details: ${JSON.stringify(error.response.body)}`
      );
    }

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

    if (response.status === 403) {
      throw new Error(
        "Registry API key is invalid, please check your config.yaml."
      );
    }

    return response.body[0];
  } catch (error) {
    logger.error(`Could not get corresponding project data: ${error.message}`);

    // Log additional information if present in the error object
    if (error.response && error.response.body) {
      logger.error(
        `Additional error details: ${JSON.stringify(error.response.body)}`
      );
    }

    throw new Error(`Could not get corresponding project data: ${error}`);
  }
};

/**
 * Placeholder function for deleting staging data.
 */
const deleteStagingData = async () => {
  console.log("Not implemented");
};

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
  const { unitBlockStart, unitBlockEnd } = utils.parseSerialNumber(
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

  const payload = {
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
    const response = await superagent
      .post(`${registryUri}/v1/units/split`)
      .send(JSON.stringify(payload))
      .set(maybeAppendRegistryApiKey({ "Content-Type": "application/json" }));

    if (response.status === 403) {
      throw new Error(
        "Registry API key is invalid, please check your config.yaml."
      );
    }

    return response.body;
  } catch (error) {
    logger.error(`Could not split unit on registry: ${error.message}`);

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
  commitStagingData,
  sanitizeUnitForUpdate,
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
  splitUnit,
  waitForRegistryDataSync,
};
