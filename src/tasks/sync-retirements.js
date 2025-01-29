const { SimpleIntervalJob, Task } = require("toad-scheduler");

const wallet = require("../chia/wallet");
const registry = require("../api/registry");
const retirementExplorer = require("../api/retirement-explorer");
const { logger } = require("../logger");
const { CONFIG } = require("../config");
const {getOrgMetaData} = require("../api/registry");
const {parseSerialNumber} = require("../utils/helpers");

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
      logger.task(`sync registries task function has completed. task exiting`);
      isTaskInProgress = false;
    } else {
      logger.debug(`sync registries task is currently in progress. skipping this invocation`);
    }
  } catch (error) {
    logger.error(`Error in sync-retirements task: ${error.message}`);
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

    const syncStatusResult = await registry.getHomeOrgSyncStatus();
    if (!syncStatusResult?.status?.home_org_profile_synced) {
      logger.warn(
        "Home organization sync is not complete, skipping sync-retirements task"
      );
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
      const retirements = await retirementExplorer.getHomeOrgRetirementActivities(
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

      let highestBlockHeightProcessed = 0;
      for (const activity of ownedRetirements) {
        // You can only autoretire your own units
        logger.info(`PROCESSING RETIREMENT ACTIVITY: ${activity.coin_id}`);

        try {
          let unitUpdatedWithRetirement = await processRetirement({
            homeOrgUid: homeOrg.orgUid,
            activityBlockHeight: activity.height,
            marketplaceIdentifier: activity.cw_unit.marketplaceIdentifier,
            amount: activity.amount / 1000,
            beneficiaryName: activity.beneficiary_name,
            beneficiaryAddress: activity.beneficiary_address,
          });

          if (unitUpdatedWithRetirement && (activity.height > highestBlockHeightProcessed)){
            highestBlockHeightProcessed = activity.height;
          }
        } catch (error) {
          logger.error(`cannot process retirement activity for asset ${activity.cw_unit.marketplaceIdentifier}. 
          Error: ${error}
          Activity: ${JSON.stringify(activity)}`);
        }
      }

      // Only set the latest processed height if we actually processed something
      // This prevents us from setting the last processed height to the same height
      // if we don't have any units to retire and prevents an unneeded transaction
      if (highestBlockHeightProcessed >= minHeight) {
        await registry.setLastProcessedHeight(highestBlockHeightProcessed);
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
 * @param {string} params.homeOrgUid - the orgUid of the home organization.
 * @param {number} params.activityBlockHeight - the orgUid of the home organization.
 * @param {string} params.marketplaceIdentifier - Marketplace Identifier.
 * @param {number} params.amount - Amount to retire.
 * @param {string} params.beneficiaryName - Beneficiary's name.
 * @param {string} params.beneficiaryAddress - Beneficiary's address.
 * @returns {Promise<boolean>} representing whether the retirement was processed to CADT
 */
const processRetirement = async ({
                                   homeOrgUid,
                                   activityBlockHeight,
                                   marketplaceIdentifier,
                                   amount,
                                   beneficiaryName,
                                   beneficiaryAddress,
                                 }) => {
  try {

    // need to wait here because the pending transaction could be updating the organizations retirement block height
    await registry.waitForRegistryDataSync();
    const unitBlocks = await registry.getAssetUnitBlocks(marketplaceIdentifier);
    const homeOrgHighestProcessedBlockHeight = await registry.getLastProcessedHeight();

    const sortedUnRetiredUnits = unitBlocks
      .filter((unit) => {
        let notRetired = unit.unitStatus !== "Retired";
        let unitBlockNotProcessed = activityBlockHeight > homeOrgHighestProcessedBlockHeight;

        return notRetired && unitBlockNotProcessed;
      })
      .sort((unitA, unitB) => {
        let unitCountDiff = unitB.unitCount - unitA.unitCount;
        if (unitCountDiff === 0) {
          let unitA_Block = parseSerialNumber(unitA.serialNumber);
          let unitB_Block = parseSerialNumber(unitB.serialNumber);

          return unitB_Block.unitBlockStart - unitA_Block.unitBlockStart;
        }
        return unitCountDiff;
      });

    if (!sortedUnRetiredUnits || sortedUnRetiredUnits.length === 0) {
      logger.task(`No unit records eligible for retirement for token with marketplace identifier ${marketplaceIdentifier}`);
      return false;
    }

    await processUnits(
      sortedUnRetiredUnits,
      amount,
      beneficiaryName,
      beneficiaryAddress
    );

    await registry.commitStagingData();
    logger.task("Auto Retirement Process Complete");
    return true;
  } catch (err) {
    throw new Error(`Could not retire unit block. ${err}`);
  }
};

/**
 * Process individual sortedRetirementEligibleUnits for retirement.
 * @param {Array<Object>} sortedRetirementEligibleUnits - Array of unit blocks to be processed.
 * @param {number} totalAmountToRetire - Amount to retire.
 * @param {string} beneficiaryName - Beneficiary's name.
 * @param {string} beneficiaryAddress - Beneficiary's address.
 * @returns {Promise<number>}
 */
const processUnits = async (
  sortedRetirementEligibleUnits,
  totalAmountToRetire,
  beneficiaryName,
  beneficiaryAddress
) => {
  let remainingAmountToRetire = totalAmountToRetire;
  for (const unit of sortedRetirementEligibleUnits) {
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
        `attempting to retire ${remainingAmountToRetire} using ${unitCount} units for ${unit.warehouseUnitId}`
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

module.exports = {
  startSyncRetirementsTask,
  job,
};
