const superagent = require("superagent");
const { getConfig } = require("./config-loader");
let CONFIG = getConfig();

const getAssetUnitBlocks = (marketPlaceIdentifier) => {
  return superagent.get(
    `${CONFIG.CADT_API_SERVER_HOST}/v1/units?filter=marketPlaceIdentifier:${marketPlaceIdentifier}:eq`
  );
};

const splitRetiredUnit = async (
  unit,
  amount,
  beneficiaryName,
  beneficiaryPublicKey
) => {
  const splitData = {
    warehouseUnitId: unit.warehouseUnitId,
    records: [
      {
        unitCount: unit.unitCount - amount,
        unitBlockStart: unit.unitBlockStart,
        unitBlockEnd: unit.unitBlockEnd,
        marketplace: unit.marketplace,
        marketplaceIdentifier: unit.marketplaceIdentifier,
        unitStatusReason: beneficiaryPublicKey || unit.unitStatusReason,
        unitOwner: beneficiaryName || unit.unitOwner,
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

  try {
    await superagent
      .post(`${CONFIG.CADT_API_SERVER_HOST}/v1/units/split`)
      .send(splitData)
      .set({ "Content-Type": "application/json" });
  } catch (error) {
    throw new Error(`Could not split detokenize unit on warehouse: ${error}`);
  }
};

const retireUnit = async (unit, beneficiaryName, beneficiaryAddress) => {
  unit.status = "retired";
  unit.unitOwner = beneficiaryName;
  unit.unitStatusReason = beneficiaryAddress;
  await updateUnit(unit);
};

const updateUnit = async (unit) => {
  try {
    await superagent
      .put(`${CONFIG.CADT_API_SERVER_HOST}/v1/units`)
      .send(unit)
      .set({ "Content-Type": "application/json" });
  } catch (error) {
    throw new Error(`Warehouse unit could not be updated: ${error}`);
  }
};

const getLastProcessedHeight = async () => {
  try {
    const response = await superagent
      .get(`${CONFIG.CADT_API_SERVER_HOST}/v1/organizations/metadata`)
      .query({ orgUid: CONFIG.HOME_ORG });
    const lastProcessedHeight = response.body["meta_last_retired_block_height"];
    return lastProcessedHeight || 0;
  } catch (error) {
    throw new Error(`Could not get last processed height: ${error}`);
  }
};

const setLastProcessedHeight = async (height) => {
  try {
    await superagent
      .get(
        `${CONFIG.CADT_API_SERVER_HOST}/v1/organizations/metadata`
      )
      .send({ last_retired_block_height: height })
      .set({ "Content-Type": "application/json" });
  } catch (error) {
    throw new Error(`Could not update last processed height: ${error}`);
  }
};

module.exports = {
  getAssetUnitBlocks,
  splitRetiredUnit,
  retireUnit,
  getLastProcessedHeight,
  setLastProcessedHeight,
};
