const request = require("request-promise");

const { getConfig } = require("./utils/config-loader");
const CONFIG = getConfig();

const commitStagingData = async () => {
  try {
    await request({
      method: "post",
      url: `${CONFIG.REGISTRY_HOST}/v1/staging/commit`,
    });
  } catch (error) {
    throw new Error(`Could not commit staging data on warehouse: ${error}`);
  }
};

const deleteStagingData = async () => {
  try {
    await request({
      method: "delete",
      url: `${CONFIG.REGISTRY_HOST}/v1//staging/clean`,
    });
  } catch (error) {
    throw new Error(`Could not delete staging data on warehouse: ${error}`);
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
    await request({
      method: "put",
      url: `${CONFIG.REGISTRY_HOST}/v1/units`,
      body: JSON.stringify(unitToBeUpdated),
      headers: { "Content-Type": "application/json" },
    });
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

  try {
    await request({
      method: "post",
      url: `${constants.API_HOST}/units/split`,
      body: JSON.stringify(dataToBeSubmitted),
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    throw new Error(`Could not split detokenize unit on warehouse: ${error}`);
  }
};

const getTokenizedUnitsByAssetId = async (assetId) => {
  try {
    const url = `${CONFIG.REGISTRY_HOST}/v1/units?marketplaceIdentifiers=${assetId}`;
    const response = await request({
      method: "get",
      url,
    });

    return JSON.parse(response);
  } catch (err) {
    throw new Error(`Could not get tokenized unit by asset id. ${err}`);
  }
};

const getProjectByWarehouseProjectId = async (warehouseProjectId) => {
  try {
    const url = `${CONFIG.REGISTRY_HOST}/v1/projects?projectIds=${warehouseProjectId}`;
    const response = await request({
      method: "get",
      url,
    });

    const data = JSON.parse(response);
    return data[0];
  } catch (error) {
    throw new Error(`Could not get corresponding project data: ${error}`);
  }
};

const getUnitByWarehouseUnitId = async (warehouseUnitId) => {
  try {
    const response = await request({
      method: "get",
      url: `${CONFIG.REGISTRY_HOST}/v1/units?warehouseUnitId=${warehouseUnitId}`,
    });

    const data = JSON.parse(response);
    return data;
  } catch (error) {
    throw new Error(
      `Could not get warehouse unit by warehouseUnitId: ${error}`
    );
  }
};

const getOrgMetaData = async (orgUid) => {
  try {
    const url = `${CONFIG.REGISTRY_HOST}/v1/organizations/metadata?orgUid=${orgUid}`;
    const response = await request({
      method: "get",
      url,
    });

    const data = JSON.parse(response);
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
  splitDetokenizeUnit,
  cleanUnitBeforeUpdating,
};
