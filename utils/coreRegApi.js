const superagent = require("superagent");
const { getConfig } = require("./config-loader");
let CONFIG = getConfig();

const getAssetUnitBlocks = (marketplaceIdentifier) => {
  const request = superagent.get(
    `${CONFIG.CADT_API_SERVER_HOST}/v1/units?filter=marketplaceIdentifier:${marketplaceIdentifier}:eq`
  );

  if (CONFIG.CADT_API_KEY) {
    request.set("x-api-key", CONFIG.CADT_API_KEY);
  }

  return request;
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
    const request = superagent
      .post(`${CONFIG.CADT_API_SERVER_HOST}/v1/units/split`)
      .send(splitData)
      .set({ "Content-Type": "application/json" });

    if (CONFIG.CADT_API_KEY) {
      request.set("x-api-key", CONFIG.CADT_API_KEY);
    }

    await request;
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
    const request = superagent
      .put(`${CONFIG.CADT_API_SERVER_HOST}/v1/units`)
      .send(unit)
      .set({ "Content-Type": "application/json" });

    if (CONFIG.CADT_API_KEY) {
      request.set("x-api-key", CONFIG.CADT_API_KEY);
    }

    await request;
  } catch (error) {
    throw new Error(`Warehouse unit could not be updated: ${error}`);
  }
};

const getLastProcessedHeight = async () => {
  try {
    const request = superagent
      .get(`${CONFIG.CADT_API_SERVER_HOST}/v1/organizations/metadata`)
      .query({ orgUid: CONFIG.HOME_ORG });

    if (CONFIG.CADT_API_KEY) {
      request.set("x-api-key", CONFIG.CADT_API_KEY);
    }

    const response = await request;

    if (response.status !== 200) {
      throw new Error(`Received non-200 status code: ${response.status}`);
    }

    const lastProcessedHeight = response.body["meta_lastRetiredBlockHeight"];
    return Number(lastProcessedHeight || 0);
  } catch (error) {
    console.error(`Could not get last processed height: ${error}`);
    throw error;
  }
};

const setLastProcessedHeight = async (height) => {
  try {
    console.log(`Setting last processed height to ${height}`);

    const request = superagent
      .post(`${CONFIG.CADT_API_SERVER_HOST}/v1/organizations/metadata`)
      .send({ lastRetiredBlockHeight: height.toString() })
      .set({ "Content-Type": "application/json" });

    if (CONFIG.CADT_API_KEY) {
      request.set("x-api-key", CONFIG.CADT_API_KEY);
    }

    const response = await request;
    console.log(response.body);
  } catch (error) {
    console.error(`Could not update last processed height: ${error}`);
  }
};

module.exports = {
  getAssetUnitBlocks,
  splitRetiredUnit,
  retireUnit,
  getLastProcessedHeight,
  setLastProcessedHeight,
};
