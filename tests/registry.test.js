const nock = require("nock");
const sinon = require("sinon");
const { expect } = require("chai");
const registry = require("../src/api/registry");
const { CONFIG, setConfig } = require("../src/config");
const { generateUriForHostAndPort } = require("../src/utils");
const OrganizationsMock = require("./data/OrganizationsMock");
const wallet = require("../src/chia/wallet");

const registryUri = generateUriForHostAndPort(
  CONFIG().CADT.PROTOCOL,
  CONFIG().CADT.HOST,
  CONFIG().CADT.PORT
);

describe("registerTokenCreationOnRegistry", () => {
  beforeEach(() => {
    nock(registryUri).get("/v1/organizations").reply(200, OrganizationsMock);
    sinon.stub(wallet, "hasUnconfirmedTransactions").resolves(false);
  });

  afterEach(() => {
    sinon.restore();
    nock.cleanAll();
  });

  it("should successfully register a token when metadata does not exist", async () => {
    const config = CONFIG();
    config.GENERAL.CORE_REGISTRY_MODE = true;
    setConfig(config);

    const tokenMock = {
      asset_id: "0x123TEST",
    };

    const warehouseUnitId = "unit-123";

    const metadataInterceptor = nock(registryUri)
      .get("/v1/organizations/metadata")
      .reply(200, {});

    const postMetadataInterceptor = nock(registryUri)
      .post("/v1/organizations/metadata")
      .reply(200);

    nock(registryUri)
      .get("/v1/units")
      .query({ warehouseUnitId })
      .reply(200, { warehouseUnitId });

    nock(registryUri)
      .put("/v1/units", (body) => {
        return (
          JSON.stringify(body) ===
          JSON.stringify({
            warehouseUnitId,
            marketplaceIdentifier: tokenMock.asset_id,
            marketplace: "Tokenized on Chia",
          })
        );
      })
      .reply(200);

    nock(registryUri).post("/v1/staging/commit").reply(200);

    await registry.registerTokenCreationOnRegistry(tokenMock, warehouseUnitId);

    expect(metadataInterceptor.isDone()).to.be.true;
    expect(postMetadataInterceptor.isDone()).to.be.true;
  }, 50000);

  it("should not submit metadata again if it already exists", async () => {
    const config = CONFIG();
    config.GENERAL.CORE_REGISTRY_MODE = true;
    setConfig(config);

    const tokenMock = {
      asset_id: "0x123TEST",
    };

    const warehouseUnitId = "unit-123";

    const metadataInterceptor = nock(registryUri)
      .get("/v1/organizations/metadata")
      .reply(200, {
        [`meta_${tokenMock.asset_id}`]: {},
      });

    const postMetadataInterceptor = nock(registryUri)
      .post("/v1/organizations/metadata")
      .reply(200);

    nock(registryUri)
      .get("/v1/units")
      .query({ warehouseUnitId })
      .reply(200, { warehouseUnitId });

    nock(registryUri)
      .put("/v1/units", (body) => {
        return (
          JSON.stringify(body) ===
          JSON.stringify({
            warehouseUnitId,
            marketplaceIdentifier: tokenMock.asset_id,
            marketplace: "Tokenized on Chia",
          })
        );
      })
      .reply(200);

    nock(registryUri).post("/v1/staging/commit").reply(200);

    await registry.registerTokenCreationOnRegistry(tokenMock, warehouseUnitId);

    expect(metadataInterceptor.isDone()).to.be.true;
    expect(postMetadataInterceptor.isDone()).to.be.false;
  }, 50000);
});
