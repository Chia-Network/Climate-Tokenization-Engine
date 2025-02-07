const superagent = require("superagent");
const { logger } = require("../logger");
const { CONFIG } = require("../config");
const registry = require("../api/registry");

const { generateUriForHostAndPort } = require("../utils");

const retirementExplorerUri = generateUriForHostAndPort(
  CONFIG().RETIREMENT_EXPLORER.PROTOCOL,
  CONFIG().RETIREMENT_EXPLORER.HOST,
  CONFIG().RETIREMENT_EXPLORER.PORT
);

/**
 * Adds Retirement Explorer API Key to the request headers if available.
 * @param {Object} headers - Optional headers to extend
 * @returns {Object} Headers with API Key added if available
 */
const maybeAppendRetirementExplorerApiKey = (headers = {}) => {
  if (CONFIG().RETIREMENT_EXPLORER.API_KEY) {
    headers["x-api-key"] = CONFIG().RETIREMENT_EXPLORER.API_KEY;
  }
  return headers;
};

/**
 * Function to get retirement activities from the explorer API.
 *
 * @param {number} page - Page number.
 * @param {number} limit - Number of activities per page.
 * @param {number} minHeight - Minimum block height to start.
 * @returns {Promise<Object>} - A promise that resolves to an array of retirement activities.
 */
const getHomeOrgRetirementActivities = async (page, limit, minHeight) => {
  try {
    const homeOrgUid = await registry.getHomeOrgUid();

    logger.debug(`GET ${retirementExplorerUri}/v1/activities`);
    const response = await superagent
      .get(`${retirementExplorerUri}/v1/activities`)
      .query({
        page,
        limit,
        org_uid: homeOrgUid,
        minHeight: Number(minHeight) + 1,
        sort: "asc",
      })
      .set(maybeAppendRetirementExplorerApiKey())
      .timeout({ response: 300000, deadline: 600000 });

    if (response.status === 403) {
      throw new Error(
        "Retirement Explorer API key is invalid, please check your config.yaml."
      );
    }

    const activities = response.body?.activities || [];

    const retirements = activities?.filter(
      (activity) => activity.mode === "PERMISSIONLESS_RETIREMENT"
    );

    return retirements;
  } catch (error) {
    logger.error("Cannot get retirement activities", error);

    // Log additional information if present in the error object
    if (error.response && error.response.body) {
      logger.error(
        `Additional error details: ${JSON.stringify(error.response.body)}`
      );
    }

    return [];
  }
};

module.exports = {
  getHomeOrgRetirementActivities,
};
