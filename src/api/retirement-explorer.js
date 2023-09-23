const superagent = require("superagent");
const { logger } = require("../logger");
const CONFIG = require('../config');

const { generateUriForHostAndPort } = require("../utils");

const retirementExplorerUri = generateUriForHostAndPort(
  CONFIG.RETIREMENT_EXPLORER.PROTOCOL,
  CONFIG.RETIREMENT_EXPLORER.HOST,
  CONFIG.RETIREMENT_EXPLORER.PORT
);

/**
 * Function to get retirement activities from the explorer API.
 *
 * @param {number} page - Page number.
 * @param {number} limit - Number of activities per page.
 * @param {number} minHeight - Minimum block height to start.
 * @returns {Promise<Array>} - A promise that resolves to an array of retirement activities.
 */
const getRetirementActivities = async (page, limit, minHeight) => {
  try {
    const response = await superagent
      .get(`${retirementExplorerUri}/v1/activities`)
      .query({
        page,
        limit,
        minHeight: Number(minHeight) + 1,
        sort: "asc",
      })
      .timeout({ response: 300000, deadline: 600000 });

    return response.body?.activities || [];
  } catch (error) {
    logger.error("Cannot get retirement activities", error);
    return [];
  }
};

module.exports = {
  getRetirementActivities,
};
