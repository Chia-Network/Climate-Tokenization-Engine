const { SimpleIntervalJob, Task } = require("toad-scheduler");
const superagent = require("superagent");
const { getConfig } = require("../utils/config-loader");
const { getLastProcessedHeight } = require('../utils/coreRegApi');
let CONFIG = getConfig();

let isTaskInProgress = false;

async function processResult({
  marketPlaceIdentifier,
  amount,
  beneficiaryName,
  beneficiaryAddress,
}) {
  // return the CADT unit records that all match this marketPlaceIdentifier
  const unitBlocks = await getAssetUnitBlocks(marketPlaceIdentifier);

  // sort from smallest to largest
  unitBlocks
    .filter((unit) => unit.unitStatus !== "Retired")
    .sort((a, b) => a.unitCount - b.unitCount);

  let remainingAmountToRetire = amount;

  for (let i = 0; i < unitBlocks.length && remainingAmountToRetire > 0; i++) {
    const unit = unitBlocks[x];
    const { unitCount } = unit;

    if (unitCount <= remainingAmountToRetire) {
      await warehouseApi.retireUnit(unit, beneficiaryName, beneficiaryAddress);
      remainingAmountToRetire -= unitCount;
    } else {
      await warehouseApi.splitRetiredUnit(
        unit,
        remainingAmountToRetire,
        beneficiaryName,
        beneficiaryAddress
      );
      remainingAmountToRetire = 0;
    }
  }

  // if there is a remaining amount to retire, then we have are attempting to retire more than we have
  // we should rollback the staging data and throw an error
  if (remainingAmountToRetire > 0) {
    await warehouseApi.deleteStagingData();
    throw new Error(
      "Could not retire unit block. Total unitCount lower than needed retire amount."
    );
  }

  // Everything went well, commit the staging data to the datalayer
  await warehouseApi.commitStagingData();
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
          minHeight: minHeight,
          sort: "asc",
        })
        .timeout({
          response: 300000, // Wait 5 minutes for the server to start sending,
          deadline: 600000, // but allow 10 minutes for the file to finish loading.
        });;

      // Assuming your API returns a JSON response
      const results = response.body;

      console.log(`Retrieved ${results.activities.length} retirement records`);

      if (results?.activities?.length > 0) {
        const activities = response.body.activities;
        await activities.map((activity) => {
          return processResult({
            marketPlaceIdentifier: activity.cw_unit.marketPlaceIdentifier,
            amount: activity.amount / 1000,
            beneficiaryName: activity.beneficiary_name,
            beneficiaryAddress: activity.beneficiary_address,
          });
        });

        const blockHeightsProcessed = findHighestHeight(activities);

        // Record the blockheight for each org

        page += 1;
      } else {
        // No more results, break out of the loop
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
