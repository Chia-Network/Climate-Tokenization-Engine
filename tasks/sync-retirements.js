const { SimpleIntervalJob, Task } = require("toad-scheduler");
const Datalayer = require("chia-datalayer");
const superagent = require("superagent");
const { getConfig } = require("../utils/config-loader");
const {
  getLastProcessedHeight,
  getAssetUnitBlocks,
  setLastProcessedHeight,
  getHomeOrg,
} = require("../utils/coreRegApi");
const warehouseApi = require("../warehouse");
const { waitForAllTransactionsToConfirm } = require("../chia/wallet");
let CONFIG = getConfig();

let isTaskInProgress = false;

async function processResult({
  marketplaceIdentifier,
  amount,
  beneficiaryName,
  beneficiaryAddress,
}) {
  try {
    await waitForAllTransactionsToConfirm();
    await waitForCadtSync();
    const unitBlocks = await getAssetUnitBlocks(marketplaceIdentifier);

    // sort from largest to smallest
    const units = unitBlocks?.body
      .filter((unit) => unit.unitStatus !== "Retired")
      .sort((a, b) => b.unitCount - a.unitCount);

    if (!units || units.length === 0) {
      console.log(
        "No units in CADT found for marketplaceIdentifier",
        marketplaceIdentifier
      );
      return;
    }

    let remainingAmountToRetire = amount;

    for (let i = 0; i < units.length; i++) {
      if (remainingAmountToRetire <= 0) {
        break;
      }

      await waitForAllTransactionsToConfirm();
      await waitForCadtSync();

      const unit = units[i];
      const { unitCount } = unit;

      console.log(unitCount, remainingAmountToRetire);

      if (unitCount <= remainingAmountToRetire) {
        await warehouseApi.retireUnit(
          unit,
          beneficiaryName,
          beneficiaryAddress
        );
        remainingAmountToRetire -= unitCount;
      } else {
        await warehouseApi.splitUnit({
          unit,
          amount: remainingAmountToRetire,
          beneficiaryName,
          beneficiaryAddress,
        });
        remainingAmountToRetire = 0;
      }
      await waitForAllTransactionsToConfirm();
      await waitForCadtSync();
    }

    // if there is a remaining amount to retire, then we have are attempting to retire more than we have
    // we should rollback the staging data and throw an error
    if (remainingAmountToRetire > 0) {
      await warehouseApi.deleteStagingData();
      throw new Error(
        "Could not retire unit block. Total unitCount lower than needed retire amount."
      );
    }

    await waitForAllTransactionsToConfirm();
    await waitForCadtSync();
    // Everything went well, commit the staging data to the datalayer
    await warehouseApi.commitStagingData();
    await new Promise((resolve) => setTimeout(() => resolve(), 5000));
    await waitForAllTransactionsToConfirm();
    console.log("Auto Retirement Process Complete");
  } catch (err) {
    console.trace(err);
    throw new Error("Could not retire unit block", err);
  }
}

function findHighestHeight(activities) {
  let highestHeight = 0;

  activities.forEach((activity) => {
    const height = activity.height;

    if (height > highestHeight) {
      highestHeight = height;
    }
  });

  return highestHeight;
}

async function waitForCadtSync() {
  await new Promise((resolve) => setTimeout(() => resolve(), 5000));

  const dataLayerConfig = {};
  if (CONFIG.DATA_LAYER_HOST) {
    dataLayerConfig.datalayer_host = CONFIG.DATA_LAYER_HOST;
  }
  if (CONFIG.WALLET_HOST) {
    dataLayerConfig.wallet_host = CONFIG.WALLET_HOST;
  }
  if (CONFIG.CERTIFICATE_FOLDER_PATH) {
    dataLayerConfig.certificate_folder_path = CONFIG.CERTIFICATE_FOLDER_PATH;
  }

  const datalayer = new Datalayer(dataLayerConfig);
  const homeOrg = await getHomeOrg();

  const onChainRegistryRoot = await datalayer.getRoot({
    id: homeOrg.registryId,
  });

  if (!onChainRegistryRoot.confirmed) {
    console.log('Waiting for Registry root to confirm');
    return waitForCadtSync();
  }

  if (onChainRegistryRoot.hash !== homeOrg.registryHash) {
    console.log('Waiting for CADT to sync with latest regisry root.', {
      onChainRoot: onChainRegistryRoot.hash,
      homeOrgRegistryRoot: homeOrg.registryHash,
    });
    return waitForCadtSync();
  }

  const onChainOrgRoot = await datalayer.getRoot({
    id: homeOrg.orgUid,
  });

  if (!onChainOrgRoot.confirmed) {
    console.log("Waiting for Organization root to confirm");
    return waitForCadtSync();
  }

  if (onChainOrgRoot.hash !== homeOrg.orgHash) {
    console.log("Waiting for CADT to sync with latest organization root.", {
      onChainRoot: onChainOrgRoot.hash,
      homeOrgRoot: homeOrg.orgHash,
    });
    return waitForCadtSync();
  }
}

async function getAndProcessActivities(minHeight = 0) {
  // Dont run if a previous task is still running
  if (isTaskInProgress) {
    console.log("A task is in progress, skipping new task start");
    return;
  }

  try {
    isTaskInProgress = true;

    let page = 1;
    const resultsLimit = 10;

    while (true) {
      console.log(`${CONFIG.CLIMATE_EXPLORER_HOST}/v1/activities`);
      const response = await superagent
        .get(`${CONFIG.CLIMATE_EXPLORER_HOST}/v1/activities`)
        .query({
          page: page,
          limit: resultsLimit,
          minHeight: Number(minHeight) + 1,
          sort: "asc",
        })
        .timeout({
          response: 300000, // Wait 5 minutes for the server to start sending,
          deadline: 600000, // but allow 10 minutes for the file to finish loading.
        });

      // Assuming your API returns a JSON response
      const results = response.body;

      // We only want to process the retirement activities
      // Also filter by height so we don't process the same activity twice
      // (this was already done by the api so this is just an extra check)
      const retirements = results?.activities?.filter(
        (activity) =>
          activity.mode === "PERMISSIONLESS_RETIREMENT" &&
          activity.height > Number(minHeight)
      );

      console.log(`Retrieved ${retirements.length || 0} retirement records`);

      if (retirements.length > 0) {
        for (const activity of retirements) {
          console.log("Processing retirement", activity);
          await waitForCadtSync();
          await processResult({
            marketplaceIdentifier: activity.cw_unit.marketplaceIdentifier,
            // the amount is mojos but each climate token is 1000 mojos
            // we want to convert the amount to climate tokens
            amount: activity.amount / 1000,
            beneficiaryName: activity.beneficiary_name,
            beneficiaryAddress: activity.beneficiary_address,
          });
          await new Promise((resolve) => setTimeout(() => resolve(), 5000));
        }

        const blockHeightsProcessed = findHighestHeight(retirements);

        await waitForAllTransactionsToConfirm();
        await waitForCadtSync();
        await setLastProcessedHeight(blockHeightsProcessed);

        page += 1;
      } else {
        break;
      }
    }
  } catch (error) {
    console.error("Can not get retirement activities", error);
  } finally {
    isTaskInProgress = false;
  }
}

const task = new Task("sync-retirements", async () => {
  console.log("Running sync-retirements task");
  const lastProcessedHeight = await getLastProcessedHeight();
  console.log(`Last processed height: ${lastProcessedHeight}`);
  await getAndProcessActivities(lastProcessedHeight);
});

const job = new SimpleIntervalJob(
  {
    seconds: 3600,
    runImmediately: true,
  },
  task,
  "sync-retirements"
);

module.exports = job;
