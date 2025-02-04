const { expect } = require("chai");
const sinon = require("sinon");
const nock = require("nock");

const syncRetirements = require("../../src/tasks/sync-retirements");
const registry = require("../../src/api/registry");
const { logger } = require("../../src/logger");
const wallet = require("../../src/chia/wallet");
const retirementExplorer = require("../../src/api/retirement-explorer");
const ActivityResponseMock = require("../data/ActivityResponseMock");
const HomeOrgMock = require("../data/HomeOrgMock");
const OrganizationsMock = require("../data/OrganizationsMock");
const { CONFIG } = require("../../src/config");
const { generateUriForHostAndPort } = require("../../src/utils");

const registryUri = generateUriForHostAndPort(
  CONFIG().CADT.PROTOCOL,
  CONFIG().CADT.HOST,
  CONFIG().CADT.PORT
);


describe("Task: Sync Retirements", () => {
  let retirementExplorerGetRetirementActivitiesStub;
  let registrySetLastProcessedHeightStub;
  let registryRetireUnitStub;
  let registrySplitUnitStub;
  let registryCommitStagingDataStub;
  let registryGetHomeOrgStub;
  let registryGetHomeOrgSyncStatusStub;

  beforeEach(() => {
    nock(registryUri).get("/v1/organizations").reply(200, OrganizationsMock);

    retirementExplorerGetRetirementActivitiesStub = sinon
      .stub(retirementExplorer, "getHomeOrgRetirementActivities")
      .resolves([]);

    registrySetLastProcessedHeightStub = sinon
      .stub(registry, "setLastProcessedHeight")
      .resolves({});

    registryGetHomeOrgSyncStatusStub = sinon.stub(registry, "getHomeOrgSyncStatus").resolves({ status: {home_org_profile_synced: true} });
    registryRetireUnitStub = sinon.stub(registry, "retireUnit").resolves();
    registrySplitUnitStub = sinon.stub(registry, "splitUnit").resolves();
    registryCommitStagingDataStub = sinon
      .stub(registry, "commitStagingData")
      .resolves();

    registryGetHomeOrgStub = sinon
      .stub(registry, "getHomeOrg")
      .resolves(HomeOrgMock);

    sinon.stub(wallet, "waitForAllTransactionsToConfirm").resolves();
    sinon.stub(registry, "waitForRegistryDataSync").resolves();
  });

  afterEach(async () => {
    sinon.restore();
    await new Promise((resolve) => setTimeout(() => resolve(), 1000));
  });

  it("skips retirement task if no homeorg can be attained by the registry", async () => {
    registryGetHomeOrgStub.resolves(null);

    const warnSpy = sinon.spy(logger, "warn");

    await syncRetirements.startSyncRetirementsTask();

    expect(warnSpy.called).to.be.true;
    expect(
      warnSpy.calledWith(
        "Can not attain home organization from the registry, skipping sync-retirements task"
      )
    ).to.be.true;

    expect(retirementExplorerGetRetirementActivitiesStub.called).to.be.false;
    expect(registrySetLastProcessedHeightStub.called).to.be.false;
  });

  it("skips retirement task if the last processed retirement height can not be attained by the registry", async () => {
    sinon.stub(registry, "getLastProcessedHeight").resolves(null);

    const warnSpy = sinon.spy(logger, "warn");

    await syncRetirements.startSyncRetirementsTask();

    expect(warnSpy.called).to.be.true;
    expect(
      warnSpy.calledWith(
        "Can not attain the last Processed Retirement Height from the registry, skipping sync-retirements task"
      )
    ).to.be.true;

    expect(retirementExplorerGetRetirementActivitiesStub.called).to.be.false;
    expect(registrySetLastProcessedHeightStub.called).to.be.false;
  });

  it("starts processing activities if valid homeorg and lastProcessedHeight can be attained by the registry", async () => {
    // Stub registry methods

    sinon.stub(registry, "getLastProcessedHeight").resolves(12345);

    // Spy on logger.warn method
    const warnSpy = sinon.spy(logger, "warn");

    // Run the method under test
    await syncRetirements.startSyncRetirementsTask();

    // Perform assertions
    expect(warnSpy.called).to.be.false;
    expect(retirementExplorerGetRetirementActivitiesStub.called).to.be.true;

    // expecting this to be false because the stub is not returning any activities
    expect(registrySetLastProcessedHeightStub.called).to.be.false;
  });

  it("skips processing activities that are not from your home org", async () => {
    const modifiedHomeOrg = Object.assign({}, HomeOrgMock);
    modifiedHomeOrg.orgUid = "DIFFERENT_ORG_UID";
    registryGetHomeOrgStub.resolves(modifiedHomeOrg);

    // Stub registry methods
    let registryGetAssetUnitBlocksStub = sinon.stub(
      registry,
      "getAssetUnitBlocks"
    );
    sinon.stub(registry, "getLastProcessedHeight").resolves(12345);
    retirementExplorerGetRetirementActivitiesStub
      .onFirstCall()
      .resolves(ActivityResponseMock.activities);
    retirementExplorerGetRetirementActivitiesStub.onSecondCall().resolves([]);

    // Spy on logger.warn method
    const warnSpy = sinon.spy(logger, "warn");

    // Run the method under test
    await syncRetirements.startSyncRetirementsTask();

    // Perform assertions
    expect(warnSpy.called).to.be.false;
    expect(retirementExplorerGetRetirementActivitiesStub.called).to.be.true;

    expect(registryGetAssetUnitBlocksStub.called).to.be.false;

    // expecting this to be false because we didnt get any activities from our home org
    expect(registrySetLastProcessedHeightStub.called).to.be.false;
  });

  it("Does not run the task if the task is already running", () => {
    /* implement this test by doing the following
     * - call the startSyncRetirementsTask function
     * - create a spy for getAndProcessActivities
     * - assert that the isTaskInProgress variable is true
     * - assert that the getAndProcessActivities function was called
     * - call the startSyncRetirementsTask function again
     * - assert that the isTaskInProgress variable is still true
     * - assert that the getAndProcessActivities function not called a second time
     * - restore the stubs
     * - restore the spy
     */
  });

  it("does not set last processed height if there are no units to retire", async () => {
    sinon.stub(registry, "getLastProcessedHeight").resolves(12345);

    retirementExplorerGetRetirementActivitiesStub.restore();
    retirementExplorerGetRetirementActivitiesStub = sinon.stub(
      retirementExplorer,
      "getHomeOrgRetirementActivities"
    );

    retirementExplorerGetRetirementActivitiesStub.onFirstCall().resolves([
      {
        amount: 5000,
        beneficiary_name: "TEST_BENEFICIARY_NAME",
        beneficiary_address: "TEST_BENEFICIARY_ADDRESS",
        height: 99999,
        mode: "PERMISSIONLESS_RETIREMENT",
        cw_unit: {
          marketplaceIdentifier: "TEST_MARKETPLACE_IDENTIFIER",
        },
        token: {
          org_uid: HomeOrgMock.orgUid,
        },
      },
      {
        amount: 5000,
        beneficiary_name: "TEST_BENEFICIARY_NAME",
        beneficiary_address: "TEST_BENEFICIARY_ADDRESS",
        height: 12346,
        mode: "PERMISSIONLESS_RETIREMENT",
        cw_unit: {
          marketplaceIdentifier: "TEST_MARKETPLACE_IDENTIFIER",
        },
        token: {
          org_uid: HomeOrgMock.orgUid,
        },
      },
    ]);

    retirementExplorerGetRetirementActivitiesStub.onSecondCall().resolves([]);

    sinon.stub(registry, "getAssetUnitBlocks").resolves([
      {
        unitStatus: "Retired",
        unitCount: 10,
        marketplaceIdentifier: "TEST_MARKETPLACE_IDENTIFIER",
      },
    ]);

    const taskSpy = sinon.spy(logger, "task");

    // Run the method under test
    await syncRetirements.startSyncRetirementsTask();

    expect(taskSpy.calledWith("No unit records eligible for retirement for token with marketplace identifier TEST_MARKETPLACE_IDENTIFIER")).to.be
      .true;

    expect(registryRetireUnitStub.called).to.be.false;
    expect(registrySplitUnitStub.called).to.be.false;

    expect(registrySetLastProcessedHeightStub.called).to.be.false;
  });

  it("writes the lastProcessedHeight to the registry when the retirments have been processed", () => {});

  it("sets the post body fields correctly when requesting retirement activities", async () => {
    const lastProcessedHeightMock = 12345;

    sinon
      .stub(registry, "getLastProcessedHeight")
      .resolves(lastProcessedHeightMock);

    await syncRetirements.startSyncRetirementsTask();

    expect(retirementExplorerGetRetirementActivitiesStub.args[0][2]).to.equal(
      lastProcessedHeightMock
    );

    // expecting this to be false because the stub is not returning any activities
    expect(registrySetLastProcessedHeightStub.called).to.be.false;
  });

  it("Does not process activities that are marked as already retired", () => {});

  it("Retires all units when amount is greater than the amount of units available for the unit block", async () => {
    sinon.stub(registry, "getLastProcessedHeight").resolves(12345);

    retirementExplorerGetRetirementActivitiesStub.restore();
    retirementExplorerGetRetirementActivitiesStub = sinon.stub(
      retirementExplorer,
      "getHomeOrgRetirementActivities"
    );

    retirementExplorerGetRetirementActivitiesStub.onFirstCall().resolves([
      {
        amount: 10000,
        beneficiary_name: "TEST_BENEFICIARY_NAME",
        beneficiary_address: "TEST_BENEFICIARY_ADDRESS",
        mode: "PERMISSIONLESS_RETIREMENT",
        height: 99999,
        cw_unit: {
          marketplaceIdentifier: "TEST_MARKETPLACE_IDENTIFIER",
        },
        token: {
          org_uid: HomeOrgMock.orgUid,
        },
      },
    ]);

    retirementExplorerGetRetirementActivitiesStub.onSecondCall().resolves([]);

    const unretiredUnit = {
      unitStatus: "Held",
      unitCount: 10,
      marketplaceIdentifier: "TEST_MARKETPLACE_IDENTIFIER",
    };

    sinon.stub(registry, "getAssetUnitBlocks").resolves([unretiredUnit]);

    await syncRetirements.startSyncRetirementsTask();

    expect(registryRetireUnitStub.calledOnce).to.be.true;
    expect(registryRetireUnitStub.args[0][0]).to.equal(unretiredUnit);
    expect(registryRetireUnitStub.args[0][1]).to.equal("TEST_BENEFICIARY_NAME");
    expect(registryRetireUnitStub.args[0][2]).to.equal(
      "TEST_BENEFICIARY_ADDRESS"
    );

    // make sure just the highest block is recorded
    expect(registrySetLastProcessedHeightStub.args[0][0]).to.equal(99999);
  });

  it("Splits the unit block when the amount is less than the amount of units available for the unit block", async () => {
    sinon.stub(registry, "getLastProcessedHeight").resolves(12345);

    retirementExplorerGetRetirementActivitiesStub.restore();
    retirementExplorerGetRetirementActivitiesStub = sinon.stub(
      retirementExplorer,
      "getHomeOrgRetirementActivities"
    );

    retirementExplorerGetRetirementActivitiesStub.onFirstCall().resolves([
      {
        amount: 5000,
        beneficiary_name: "TEST_BENEFICIARY_NAME",
        beneficiary_address: "TEST_BENEFICIARY_ADDRESS",
        height: 99999,
        mode: "PERMISSIONLESS_RETIREMENT",
        cw_unit: {
          marketplaceIdentifier: "TEST_MARKETPLACE_IDENTIFIER",
        },
        token: {
          org_uid: HomeOrgMock.orgUid,
        },
      },
      {
        amount: 5000,
        beneficiary_name: "TEST_BENEFICIARY_NAME",
        beneficiary_address: "TEST_BENEFICIARY_ADDRESS",
        height: 12346,
        mode: "PERMISSIONLESS_RETIREMENT",
        cw_unit: {
          marketplaceIdentifier: "TEST_MARKETPLACE_IDENTIFIER",
        },
        token: {
          org_uid: HomeOrgMock.orgUid,
        },
      },
    ]);

    retirementExplorerGetRetirementActivitiesStub.onSecondCall().resolves([]);

    const unretiredUnit = {
      unitStatus: "Held",
      unitCount: 10,
      marketplaceIdentifier: "TEST_MARKETPLACE_IDENTIFIER",
    };

    const unretiredUnitAfterSplit = {
      unitStatus: "Held",
      unitCount: 5,
      marketplaceIdentifier: "TEST_MARKETPLACE_IDENTIFIER",
    };

    const registryGetAssetUnitBlocksStub = sinon.stub(
      registry,
      "getAssetUnitBlocks"
    );
    registryGetAssetUnitBlocksStub.onFirstCall().resolves([unretiredUnit]);
    registryGetAssetUnitBlocksStub
      .onSecondCall()
      .resolves([unretiredUnitAfterSplit]);

    await syncRetirements.startSyncRetirementsTask();

    expect(registrySplitUnitStub.calledOnce).to.be.true;
    expect(registrySplitUnitStub.args[0][0].unit).to.equal(unretiredUnit);
    expect(registrySplitUnitStub.args[0][0].amount).to.equal(5);
    expect(registrySplitUnitStub.args[0][0].beneficiaryName).to.equal(
      "TEST_BENEFICIARY_NAME"
    );
    expect(registrySplitUnitStub.args[0][0].beneficiaryAddress).to.equal(
      "TEST_BENEFICIARY_ADDRESS"
    );

    expect(registryRetireUnitStub.calledOnce).to.be.true;
    expect(registrySplitUnitStub.calledOnce).to.be.true;

    expect(registryRetireUnitStub.args[0][0]).to.equal(unretiredUnitAfterSplit);
    expect(registryRetireUnitStub.args[0][1]).to.equal("TEST_BENEFICIARY_NAME");
    expect(registryRetireUnitStub.args[0][2]).to.equal(
      "TEST_BENEFICIARY_ADDRESS"
    );

    expect(registryCommitStagingDataStub.callCount).to.equal(2);

    // make sure just the highest block is recorded
    expect(registrySetLastProcessedHeightStub.args[0][0]).to.equal(99999);
  });
});
