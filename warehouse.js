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
  console.log("detokenize warehouse unit:", unit);
};

const splitDetokenizeUnit = async (unit, amount) => {
  console.log(
    "split detokenize warehouse unit:",
    unit,
    " with amount: ",
    amount
  );
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
  getOrgMetaData,
  detokenizeUnit,
  splitDetokenizeUnit,
};
