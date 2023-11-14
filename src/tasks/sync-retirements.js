const { SimpleIntervalJob, Task } = require("toad-scheduler");

const wallet = require("../chia/wallet");
const registry = require("../api/registry");
const retirementExplorer = require("../api/retirement-explorer");
const { logger } = require("../logger");
const { CONFIG } = require("../config");

let isTaskInProgress = false;

/**
 * Scheduler task definition.
 */
const task = new Task("sync-retirements", async () => {
  try {
    if (!isTaskInProgress) {
      logger.task("Starting sync-retirements task");
      isTaskInProgress = true;
      await startSyncRetirementsTask();
    }
  } catch (error) {
    logger.error(`Error in sync-retirements task: ${error.message}`);
  } finally {
    isTaskInProgress = false;
  }
});

/**
 * Job configuration and initiation.
 */
const job = new SimpleIntervalJob(
  {
    seconds:
      CONFIG().TOKENIZATION_ENGINE.TASKS
        .SYNC_RETIREMENTS_TO_REGISTRY_INTERVAL_SECONDS,
    runImmediately: true,
  },
  task,
  // @ts-ignore
  "sync-retirements"
);

/**
 * Starts the sync-retirements task, which retrieves and processes retirement activities.
 * @returns {Promise<void>}
 */
const startSyncRetirementsTask = async () => {
  try {
    await registry.waitForRegistryDataSync({ throwOnEmptyRegistry: true });
    const homeOrg = await registry.getHomeOrg();

    if (!homeOrg) {
      logger.warn(
        "Can not attain home organization from the registry, skipping sync-retirements task"
      );
      return;
    }

    const lastProcessedHeight = await registry.getLastProcessedHeight();
    if (lastProcessedHeight == null) {
      logger.warn(
        "Can not attain the last Processed Retirement Height from the registry, skipping sync-retirements task"
      );
      return;
    }

    await getAndProcessActivities(homeOrg, lastProcessedHeight);
  } catch (error) {
    logger.error(`Error in sync-retirements task: ${error.message}`);
  }
};

/**
 * Get and process retirement activities from the API.
 * @param {number} minHeight - Minimum block height to start.
 * @returns {Promise<void>}
 */
const getAndProcessActivities = async (homeOrg, minHeight = 0) => {
  try {
    let page = 1;
    const limit = 10;
    while (true) {
      const retirements = await retirementExplorer.getRetirementActivities(
        page,
        limit,
        minHeight
      );

      logger.debug(`Retirement activities: ${JSON.stringify(retirements)}`);

      if (!retirements?.length) {
        break;
      }
      const ownedRetirements = retirements.filter(
        (activity) => activity?.token?.org_uid === homeOrg.orgUid
      );

      if (!ownedRetirements?.length) {
        page++;
        continue;
      }

      logger.debug(
        `Owned Retirement activities: ${JSON.stringify(retirements)}`
      );

      for (const activity of ownedRetirements) {
        // You can only autoretire your own units
        logger.info(`PROCESSING RETIREMENT ACTIVITY: ${activity.coin_id}`);
        await processResult({
          marketplaceIdentifier: activity.cw_unit.marketplaceIdentifier,
          amount: activity.amount / 1000,
          beneficiaryName: activity.beneficiary_name,
          beneficiaryAddress: activity.beneficiary_address,
        });
      }

      const highestHeight = calcHighestActivityHeight(retirements);

      // Only set the latest processed height if we actually processed something
      // This prevents us from setting the last processed height to the same height
      // if we don't have any units to retire and prevents an unneeded transaction
      if (highestHeight >= minHeight) {
        await registry.setLastProcessedHeight(highestHeight);
      }

      page++;
    }
  } catch (error) {
    throw new Error(`Cannot get retirement activities: ${error.message}`);
  }
};

/**
 * Process retirement result.
 * @param {Object} params - Parameters.
 * @param {string} params.marketplaceIdentifier - Marketplace Identifier.
 * @param {number} params.amount - Amount to retire.
 * @param {string} params.beneficiaryName - Beneficiary's name.
 * @param {string} params.beneficiaryAddress - Beneficiary's address.
 * @returns {Promise<void>}
 */
const processResult = async ({
  marketplaceIdentifier,
  amount,
  beneficiaryName,
  beneficiaryAddress,
}) => {
  try {
    await registry.waitForRegistryDataSync();
    const unitBlocks = await registry.getAssetUnitBlocks(marketplaceIdentifier);

    const units = unitBlocks
      .filter((unit) => unit.unitStatus !== "Retired")
      .sort((a, b) => b.unitCount - a.unitCount);

    if (!units || units.length === 0) {
      logger.task(`No units for ${marketplaceIdentifier}`);
      return;
    }

    const remainingAmountToRetire = await processUnits(
      units,
      amount,
      beneficiaryName,
      beneficiaryAddress
    );

    if (remainingAmountToRetire > 0) {
      await registry.deleteStagingData();
      throw new Error("Total unitCount lower than needed retire amount.");
    }

    await registry.commitStagingData();
    logger.task("Auto Retirement Process Complete");
  } catch (err) {
    throw new Error("Could not retire unit block");
  }
};

/**
 * Process individual units for retirement.
 * @param {Array<Object>} units - Array of unit blocks to be processed.
 * @param {number} amount - Amount to retire.
 * @param {string} beneficiaryName - Beneficiary's name.
 * @param {string} beneficiaryAddress - Beneficiary's address.
 * @returns {Promise<number>}
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

    if (isNaN(unitCount)) {
      logger.error(
        `unitCount for unit ${unit.warehouseUnitId} is not a number. Skipping this unit.`
      );
      break;
    } else {
      logger.task(
        `Retiring ${unitCount} units for ${unit.warehouseUnitId} with ${remainingAmountToRetire} remaining`
      );
    }

    if (unitCount <= remainingAmountToRetire) {
      await registry.retireUnit(unit, beneficiaryName, beneficiaryAddress);
      remainingAmountToRetire -= unitCount;
    } else {
      await registry.splitUnit({
        unit,
        amount: remainingAmountToRetire,
        beneficiaryName,
        beneficiaryAddress,
      });
      remainingAmountToRetire = 0;
    }
    await wallet.waitForAllTransactionsToConfirm();
  }

  return remainingAmountToRetire;
};

/**
 * Helper function to find the highest height among retirement activities.
 * @param {Array<Object>} activities - Array of retirement activities.
 * @returns {number} The highest block height.
 */
const calcHighestActivityHeight = (activities) => {
  let highestHeight = 0;

  activities.forEach((activity) => {
    const height = activity.height;

    if (height > highestHeight) {
      highestHeight = height;
    }
  });

  return highestHeight;
};

module.exports = {
  startSyncRetirementsTask,
  job,
};
