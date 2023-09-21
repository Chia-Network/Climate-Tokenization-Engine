
const { SimpleIntervalJob, Task } = require("toad-scheduler");
const superagent = require("superagent");
const {
  getConfig,
  logger,
  waitForAllTransactionsToConfirm,
  getHomeOrg,
  getLastProcessedHeight,
  setLastProcessedHeight,
  retireUnit,
  splitUnit,
  deleteStagingData,
  commitStagingData,
} = require("../../utils");

/**
 * Global variables
 */
let CONFIG = getConfig();
let isTaskInProgress = false;

/**
 * Process individual units for retirement
 * @param {Array<Object>} units - Array of unit blocks to be processed
 * @param {number} amount - Amount to retire
 * @param {string} beneficiaryName - Beneficiary's name
 * @param {string} beneficiaryAddress - Beneficiary's address
 * @returns {Promise<void>}
 */
const processUnits = async (
  units,
  amount,
  beneficiaryName,
  beneficiaryAddress
) => {
  let remainingAmountToRetire = amount;
  for (const unit of units) {
    if (remainingAmountToRetire <= 0) {
      break;
    }
    const { unitCount } = unit;
    if (unitCount <= remainingAmountToRetire) {
      await retireUnit(unit, beneficiaryName, beneficiaryAddress);
      remainingAmountToRetire -= unitCount;
    } else {
      await splitUnit({
        unit,
        amount: remainingAmountToRetire,
        beneficiaryName,
        beneficiaryAddress,
      });
      remainingAmountToRetire = 0;
    }
    await waitForAllTransactionsToConfirm();
  }
};

/**
 * Main function to process retirement result
 * @param {Object} params - Parameters
 * @param {string} params.marketplaceIdentifier - Marketplace Identifier
 * @param {number} params.amount - Amount to retire
 * @param {string} params.beneficiaryName - Beneficiary's name
 * @param {string} params.beneficiaryAddress - Beneficiary's address
 * @returns {Promise<void>}
 */
const processResult = async ({
  marketplaceIdentifier,
  amount,
  beneficiaryName,
  beneficiaryAddress,
}) => {
  try {
    const unitBlocks = await getAssetUnitBlocks(marketplaceIdentifier);
    const units = unitBlocks?.body
      .filter((unit) => unit.unitStatus !== "Retired")
      .sort((a, b) => b.unitCount - a.unitCount);
    if (!units || units.length === 0) {
      logger.info(`No units for ${marketplaceIdentifier}`);
      return;
    }
    await processUnits(units, amount, beneficiaryName, beneficiaryAddress);
    if (remainingAmountToRetire > 0) {
      await deleteStagingData();
      throw new Error("Total unitCount lower than needed retire amount.");
    }
    await commitStagingData();
    logger.info("Auto Retirement Process Complete");
  } catch (err) {
    console.trace(err);
    throw new Error("Could not retire unit block", err);
  }
};

/**
 * Function to get and process activities from API
 * @param {number} minHeight - Minimum block height to start
 * @returns {Promise<void>}
 */
const getAndProcessActivities = async (minHeight = 0) => {
  if (isTaskInProgress) {
    return;
  }
  isTaskInProgress = true;
  try {
    let page = 1;
    const limit = 10;
    while (true) {
      const { body } = await superagent
        .get(`${CONFIG.CLIMATE_EXPLORER_HOST}/v1/activities`)
        .query({ page, limit, minHeight: Number(minHeight) + 1, sort: "asc" })
        .timeout({ response: 300000, deadline: 600000 });
      const retirements =
        body?.activities?.filter(
          (a) =>
            a.mode === "PERMISSIONLESS_RETIREMENT" &&
            a.height > Number(minHeight)
        ) || [];
      if (!retirements.length && !body?.activities?.length) {
        break;
      }
      for (const activity of retirements) {
        await processResult({
          marketplaceIdentifier: activity.cw_unit.marketplaceIdentifier,
          amount: activity.amount / 1000,
          beneficiaryName: activity.beneficiary_name,
          beneficiaryAddress: activity.beneficiary_address,
        });
      }
      const highestHeight = findHighestHeight(retirements);
      await setLastProcessedHeight(highestHeight);
      page++;
    }
  } catch (error) {
    console.error("Cannot get retirement activities", error);
  } finally {
    isTaskInProgress = false;
  }
};

/**
 * Scheduler task definition
 */
const task = new Task("sync-retirements", async () => {
  const homeOrg = await getHomeOrg();
  if (!homeOrg) {
    return;
  }
  const lastProcessedHeight = await getLastProcessedHeight();
  await getAndProcessActivities(lastProcessedHeight);
});

/**
 * Job configuration and initiation
 */
const job = new SimpleIntervalJob(
  { seconds: 300, runImmediately: true },
  task,
  "sync-retirements"
);

/**
 * Export the job
 */
module.exports = job;
