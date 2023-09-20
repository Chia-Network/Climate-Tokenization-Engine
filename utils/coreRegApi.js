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

const retireUnit = async (unit, beneficiaryName, beneficiaryAddress) => {
  unit.status = "retired";
  unit.unitOwner = beneficiaryName;
  unit.unitStatusReason = beneficiaryAddress;
  await updateUnit(unit);
};

const updateUnit = async (unit) => {
 // try {
    const request = superagent
      .put(`${CONFIG.CADT_API_SERVER_HOST}/v1/units`)
      .send(unit)
      .set({ "Content-Type": "application/json" });

    if (CONFIG.CADT_API_KEY) {
      request.set("x-api-key", CONFIG.CADT_API_KEY);
    }

    await request;
//  } catch (error) {
 //   throw new Error(`Warehouse unit could not be updated: ${error}`);
 // }
};

const getLastProcessedHeight = async () => {
  
  try {
    const homeOrgUid = await getHomeOrgUid();

    const request = superagent
      .get(`${CONFIG.CADT_API_SERVER_HOST}/v1/organizations/metadata`)
      .query({ orgUid: homeOrgUid });

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

const getHomeOrgUid = async () => {
  try {
    const homeOrg = await getHomeOrg();
    if (homeOrg) {
      return homeOrg.orgUid;
    }

    return null;
  } catch (error) {
    console.error(`Could not get home organization UID: ${error}`);
    return null;
  }
};

const getHomeOrg = async () => {
  try {
    const request = superagent.get(
      `${CONFIG.CADT_API_SERVER_HOST}/v1/organizations`
    );

    if (CONFIG.CADT_API_KEY) {
      request.set("x-api-key", CONFIG.CADT_API_KEY);
    }

    const response = await request;

    if (response.status !== 200) {
      throw new Error(`Received non-200 status code: ${response.status}`);
    }

    // Iterate through the response keys and find the object where "isHome" is true
    let homeOrg = null;
    for (const key in response.body) {
      if (response.body[key].isHome === true) {
        homeOrg = response.body[key];
        break;
      }
    }

    if (!homeOrg) {
      console.error(
        'No organization with "isHome" equal to true found in the response'
      );
      return null;
    }

    return homeOrg;
  } catch (error) {
    console.error(`Could not get home organization UID: ${error}`);
    return null;
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
  retireUnit,
  getLastProcessedHeight,
  setLastProcessedHeight,
  getHomeOrgUid,
  getHomeOrg,
};
