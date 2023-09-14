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
    // Give it time to go into pending status before returning
    await new Promise((resolve) => setTimeout(() => resolve(), 5000));
  } catch (error) {
    throw new Error(`Could not commit staging data on warehouse: ${error}`);
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

  return unitToBeUpdated;
};

const retireUnit = async (unit, beneficiaryName, beneficiaryAddress) => {
  const cleanedUnit = cleanUnitBeforeUpdating(unit);
  if (beneficiaryName) {
    cleanedUnit.unitOwner = beneficiaryName;
  }

  if (beneficiaryAddress) {
    cleanedUnit.unitStatusReason = beneficiaryAddress;
  }

  cleanedUnit.unitStatus = "Retired";

  console.log("Retiring Unit", cleanedUnit.warehouseUnitId);
  await updateUnit(cleanedUnit);
};

const insertUnit = async (unit) => {
  console.log(
    "inserting unit",
    `${CONFIG.CADT_API_SERVER_HOST}/v1/units`,
    unit
  );
  //try {
  delete unit?.warehouseUnitId;
  delete unit?.issuance?.orgUid;
  delete unit.issuanceId;
  delete unit.orgUid;
  delete unit.serialNumberBlock;

  const request = superagent
    .post(`${CONFIG.CADT_API_SERVER_HOST}/v1/units`)
    .send(unit)
    .set("Content-Type", "application/json");

  if (CONFIG.CADT_API_KEY) {
    request.set("x-api-key", CONFIG.CADT_API_KEY);
  }

  await request;
  // } catch (error) {
  //   throw new Error(`Warehouse unit could not be updated: ${error}`);
  // }
};

const deleteUnit = async (unit) => {
  try {
    const request = superagent
      .delete(`${CONFIG.CADT_API_SERVER_HOST}/v1/units`)
      .send({ warehouseUnitId: unit.warehouseUnitId })
      .set("Content-Type", "application/json");

    if (CONFIG.CADT_API_KEY) {
      request.set("x-api-key", CONFIG.CADT_API_KEY);
    }

    await request;
  } catch (error) {
    throw new Error(`Warehouse unit could not be updated: ${error}`);
  }
};

const updateUnit = async (unitToBeUpdated) => {
  console.log(
    "updating unit",
    `${CONFIG.CADT_API_SERVER_HOST}/v1/units`,
    unitToBeUpdated.warehouseUnitId
  );
  // try {
  delete unitToBeUpdated?.issuance?.orgUid;
  delete unitToBeUpdated.issuanceId;
  delete unitToBeUpdated.orgUid;
  delete unitToBeUpdated.serialNumberBlock;
  delete unitToBeUpdated?.timeStaged;

  const request = superagent
    .put(`${CONFIG.CADT_API_SERVER_HOST}/v1/units`)
    .send(unitToBeUpdated)
    .set("Content-Type", "application/json");

  if (CONFIG.CADT_API_KEY) {
    request.set("x-api-key", CONFIG.CADT_API_KEY);
  }

  await request;
  // } catch (error) {
  // throw new Error(`Warehouse unit could not be updated: ${error}`);
  // }
};

const parseSerialNumber = (serialNumberBlock) => {
  const serialNumberBlockPattern = /^([a-zA-Z0-9]+-)?(\d+)-(\d+)$/;
  const matches = serialNumberBlock.match(serialNumberBlockPattern);

  if (!matches) {
    return undefined; // Return undefined for wrong format
  }

  let prefix = null;
  let unitBlockStart;
  let unitBlockEnd;

  if (matches[1]) {
    prefix = matches[1].slice(0, -1); // Remove the trailing hyphen
  }
  unitBlockStart = matches[2];
  unitBlockEnd = matches[3];

  return { prefix, unitBlockStart, unitBlockEnd };
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

module.exports = {
  commitStagingData,
  updateUnit,
  cleanUnitBeforeUpdating,
  insertUnit,
  deleteUnit,
  retireUnit,
  splitUnit,
};
