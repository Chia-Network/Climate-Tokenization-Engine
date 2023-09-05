const superagent = require("superagent");
const { getConfig } = require("./utils/config-loader");
const CONFIG = getConfig();

const commitStagingData = async () => {
  try {
    const request = superagent.post(
      `${CONFIG.CADT_API_SERVER_HOST}/v1/staging/commit`
    );

    if (CONFIG.CADT_API_KEY) {
      request.set("x-api-key", CONFIG.CADT_API_KEY);
    }

    await request;
  } catch (error) {
    throw new Error(`Could not commit staging data on warehouse: ${error}`);
  }
};

const deleteStagingData = async () => {
  try {
    const request = superagent.delete(
      `${CONFIG.CADT_API_SERVER_HOST}/v1/staging/clean`
    );

    if (CONFIG.CADT_API_KEY) {
      request.set("x-api-key", CONFIG.CADT_API_KEY);
    }

    await request;
  } catch (error) {
    throw new Error(`Could not delete staging data on warehouse: ${error}`);
  }
};

const getHasPendingTransactions = async () => {
  try {
    const request = superagent.get(
      `${CONFIG.CADT_API_SERVER_HOST}/v1/staging/hasPendingTransactions`
    );

    if (CONFIG.CADT_API_KEY) {
      request.set("x-api-key", CONFIG.CADT_API_KEY);
    }

    const response = await request;

    const data = response.body;
    return Boolean(data?.confirmed);
  } catch (error) {
    throw new Error(
      `Could not determine if there are pending transactions on warehouse: ${error}`
    );
  }
};

const cleanUnitBeforeUpdating = (unit) => {
  const unitToBeUpdated = { ...unit };
  delete unitToBeUpdated?.issuance?.orgUid;
  delete unitToBeUpdated.issuanceId;
  delete unitToBeUpdated.orgUid;
  delete unitToBeUpdated.serialNumberBlock;

  Object.keys(unitToBeUpdated).forEach(function (key, index) {
    if (this[key] == null) delete this[key];
  }, unitToBeUpdated);
};

const updateUnit = async (unitToBeUpdated) => {
  try {
    const request = superagent
      .put(`${CONFIG.CADT_API_SERVER_HOST}/v1/units`)
      .send(JSON.stringify(unitToBeUpdated))
      .set("Content-Type", "application/json");

    if (CONFIG.CADT_API_KEY) {
      request.set("x-api-key", CONFIG.CADT_API_KEY);
    }

    await request;
  } catch (error) {
    throw new Error(`Warehouse unit could not be updated: ${error}`);
  }
};

const detokenizeUnit = async (unit) => {
  const unitToBeDetokenized = cleanUnitBeforeUpdating(unit);
  unitToBeDetokenized.marketplace = null;
  unitToBeDetokenized.marketplaceIdentifier = null;
  await updateUnit(unitToBeDetokenized);
};

const retireUnit = async (unit, beneficiaryName, beneficiaryAddress) => {
  const cleanedUnit = cleanUnitBeforeUpdating(unit);
  if (beneficiaryName) {
    cleanedUnit.unitOwner = beneficiaryName;
  }

  if (beneficiaryAddress) {
    cleanedUnit.unitStatusReason = beneficiaryAddress;
  }

  cleanedUnit.unitStatus = "retired";

  console.log("retireing unit", cleanedUnit);
  await updateUnit(cleanedUnit);
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
  
  // Check if serialNumberBlock is in the right format
  const serialNumberBlockPattern = /^([a-zA-Z0-9]+)-(\d+)-(\d+)$/;
  console.log(unit.serialNumberBlock);
  if (!serialNumberBlockPattern.test(unit.serialNumberBlock)) {
    throw new Error("serialNumberBlock is not in the correct format");
  }

  // Parse the serialNumberBlock
  const [prefix, unitBlockStart, unitBlockEnd] =
    unit.serialNumberBlock.split("-");
  const totalUnits = parseInt(unitBlockEnd) - parseInt(unitBlockStart) + 1;

  if (amount >= totalUnits) {
    throw new Error("Amount must be less than total units in the block");
  }

  // Create new unit blocks based on the amount
  const newUnitBlockEnd1 = parseInt(unitBlockStart) + amount - 1;
  const newUnitBlockStart2 = newUnitBlockEnd1 + 1;

  const dataToBeSubmitted = {
    warehouseUnitId: unit.warehouseUnitId,
    records: [
      {
        unitCount: amount,
        unitBlockStart: unitBlockStart,
        unitBlockEnd: newUnitBlockEnd1.toString(),
        marketplace: unit.marketplace,
        marketplaceIdentifier: unit.marketplaceIdentifier,
        serialNumberBlock: `${prefix}-${unitBlockStart}-${newUnitBlockEnd1}`,
        unitStatus: "Retired",
        unitOwner: beneficiaryName,
        unitStatusReason: beneficiaryAddress,
      },
      {
        unitCount: totalUnits - amount - 1,
        unitBlockStart: newUnitBlockStart2.toString(),
        unitBlockEnd: unitBlockEnd,
        marketplace: unit.marketplace,
        marketplaceIdentifier: unit.marketplaceIdentifier,
        serialNumberBlock: `${prefix}-${newUnitBlockStart2}-${unitBlockEnd}`,
      },
    ],
  };

  try {
    const request = superagent
      .post(`${CONFIG.CADT_API_SERVER_HOST}/v1/units/split`)
      .send(JSON.stringify(dataToBeSubmitted))
      .set("Content-Type", "application/json");

    if (CONFIG.CADT_API_KEY) {
      request.set("x-api-key", CONFIG.CADT_API_KEY);
    }

    await request;
  } catch (error) {
    console.trace(error);
    throw new Error(`Could not split detokenize unit on warehouse: ${error}`);
  }
};

const splitDetokenizeUnit = async (unit, amount) => {
  const dataToBeSubmitted = {
    warehouseUnitId: unit.warehouseUnitId,
    records: [
      {
        unitCount: unit.unitCount - amount,
        unitBlockStart: unit.unitBlockStart,
        unitBlockEnd: unit.unitBlockEnd,
        marketplace: unit.marketplace,
        marketplaceIdentifier: unit.marketplaceIdentifier,
      },
      {
        unitCount: amount,
        unitBlockStart: unit.unitBlockStart,
        unitBlockEnd: unit.unitBlockEnd,
        marketplace: null,
        marketplaceIdentifier: null,
      },
    ],
  };

  console.log(
    "splitting units",
    `${CONFIG.CADT_API_SERVER_HOST}/v1/units/split`
  );

  try {
    const request = superagent
      .post(`${CONFIG.CADT_API_SERVER_HOST}/v1/units/split`)
      .send(JSON.stringify(dataToBeSubmitted))
      .set("Content-Type", "application/json");

    if (CONFIG.CADT_API_KEY) {
      request.set("x-api-key", CONFIG.CADT_API_KEY);
    }

    await request;
  } catch (error) {
    throw new Error(`Could not split detokenize unit on warehouse: ${error}`);
  }
};

const getTokenizedUnitsByAssetId = async (assetId) => {
  try {
    const request = superagent.get(
      `${CONFIG.CADT_API_SERVER_HOST}/v1/units?marketplaceIdentifiers=${assetId}`
    );

    if (CONFIG.CADT_API_KEY) {
      request.set("x-api-key", CONFIG.CADT_API_KEY);
    }

    const response = await request;

    return response.body;
  } catch (err) {
    throw new Error(`Could not get tokenized unit by asset id. ${err}`);
  }
};

const getProjectByWarehouseProjectId = async (warehouseProjectId) => {
  try {
    const request = superagent.get(
      `${CONFIG.CADT_API_SERVER_HOST}/v1/projects?projectIds=${warehouseProjectId}`
    );

    if (CONFIG.CADT_API_KEY) {
      request.set("x-api-key", CONFIG.CADT_API_KEY);
    }

    const response = await request;

    const data = response.body;
    return data[0];
  } catch (error) {
    throw new Error(`Could not get corresponding project data: ${error}`);
  }
};

const getUnitByWarehouseUnitId = async (warehouseUnitId) => {
  try {
    const request = superagent.get(
      `${CONFIG.CADT_API_SERVER_HOST}/v1/units?warehouseUnitId=${warehouseUnitId}`
    );

    if (CONFIG.CADT_API_KEY) {
      request.set("x-api-key", CONFIG.CADT_API_KEY);
    }

    const response = await request;

    const data = response.body;
    return data;
  } catch (error) {
    throw new Error(
      `Could not get warehouse unit by warehouseUnitId: ${error}`
    );
  }
};

const registerToken = async (token) => {
  try {
    const request = superagent
      .post(`${CONFIG.CADT_API_SERVER_HOST}/v1/organizations/metadata`)
      .send(JSON.stringify({ [token.asset_id]: token }))
      .set("Content-Type", "application/json");

    if (CONFIG.CADT_API_KEY) {
      request.set("x-api-key", CONFIG.CADT_API_KEY);
    }

    const response = await request;

    const data = response.body;
    return data;
  } catch (error) {
    throw new Error(`Could not register token on warehouse: ${error}`);
  }
};

const getOrgMetaData = async (orgUid) => {
  try {
    const request = superagent.get(
      `${CONFIG.CADT_API_SERVER_HOST}/v1/organizations/metadata?orgUid=${orgUid}`
    );

    if (CONFIG.CADT_API_KEY) {
      request.set("x-api-key", CONFIG.CADT_API_KEY);
    }

    const response = await request;

    const data = response.body;
    return data;
  } catch (error) {
    throw new Error(`Could not get org meta data: ${error}`);
  }
};

module.exports = {
  commitStagingData,
  deleteStagingData,
  updateUnit,
  getTokenizedUnitsByAssetId,
  getProjectByWarehouseProjectId,
  getUnitByWarehouseUnitId,
  getOrgMetaData,
  detokenizeUnit,
  registerToken,
  splitDetokenizeUnit,
  cleanUnitBeforeUpdating,
  getHasPendingTransactions,
  splitUnit,
  retireUnit,
};
