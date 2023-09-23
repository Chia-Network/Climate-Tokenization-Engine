const { SimpleIntervalJob, Task } = require("toad-scheduler");
const { logger } = require("../logger");
const { waitForAllTransactionsToConfirm } = require("../chia/wallet");
const { getRetirementActivities } = require("../api/retirement-explorer");

const {
  commitStagingData,
  deleteStagingData,
  splitUnit,
  retireUnit,
  setLastProcessedHeight,
  getHomeOrg,
  getLastProcessedHeight,
  getAssetUnitBlocks,
} = require("../api/registry");

let isTaskInProgress = false;

const findHighestHeight = (activities) => {
  let highestHeight = 0;

  activities.forEach((activity) => {
    const height = activity.height;

    if (height > highestHeight) {
      highestHeight = height;
    }
  });

  return highestHeight;
};

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
      logger.task(`No units for ${marketplaceIdentifier}`);
      return;
    }
    await processUnits(units, amount, beneficiaryName, beneficiaryAddress);
    if (remainingAmountToRetire > 0) {
      await deleteStagingData();
      throw new Error("Total unitCount lower than needed retire amount.");
    }
    await commitStagingData();
    logger.task("Auto Retirement Process Complete");
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
  try {
    let page = 1;
    const limit = 10;
    while (true) {
      const retirements = await getRetirementActivities(page, limit, minHeight);

      if (!retirements.length) {
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
    throw new Error(`Cannot get retirement activities: ${error.message}`);
  } finally {
    isTaskInProgress = false;
  }
};

/**
 * Scheduler task definition
 */
const task = new Task("sync-retirements", async () => {
  logger.task("Starting sync-retirements task");
  try {
    const homeOrg = await getHomeOrg();
    if (!homeOrg) {
      logger.warn(
        "Can not attain home organization from the registry, skipping sync-retirements task"
      );
      return;
    }

    const lastProcessedHeight = await getLastProcessedHeight();
    if (lastProcessedHeight == null) {
      logger.warn(
        "Can not attain the last Processed Retirement Height from the registry, skipping sync-retirements task"
      );
      return;
    }

    if (!isTaskInProgress) {
      isTaskInProgress = true;
      await getAndProcessActivities(lastProcessedHeight);
    }
  } catch (error) {
    logger.task_error(`Error in sync-retirements task: ${error.message}`);
  }
});

/**
 * Job configuration and initiation
 */
const job = new SimpleIntervalJob(
  { seconds: 300, runImmediately: true },
  task,
  "sync-retirements"
);

module.exports = job;
