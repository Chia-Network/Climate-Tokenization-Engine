const { expect } = require("chai");
const sinon = require("sinon");
const request = require("supertest");
const nock = require("nock");

const { app, stopServer } = require("../src/server");
const wallet = require("../src/chia/wallet");
const registry = require("../src/api/registry");
const tokenDriver = require("../src/api/token-driver");
const TokenCreatedResponseMock = require("./data/TokenCreateResponseMock");
const UnitMock = require("./data/UnitMock");
const OrganizationsMock = require("./data/OrganizationsMock");
const { CONFIG, setConfig } = require("../src/config");

// Create a nock interceptor for the registry API
const registryMock = nock(
  `${CONFIG().CADT.PROTOCOL}://${CONFIG().CADT.HOST}:${CONFIG().CADT.PORT}`
);
const tokenDriverMock = nock(
  `${CONFIG().CHIA_CLIMATE_TOKENIZATION.PROTOCOL}://${
    CONFIG().CHIA_CLIMATE_TOKENIZATION.HOST
  }:${CONFIG().CHIA_CLIMATE_TOKENIZATION.PORT}`
);

describe("Create Token Process", () => {
  let walletHasUnconfirmedTransactionsStub;
  let createTokenPayload;

  beforeEach(() => {
    registryMock.get("/v1/organizations").reply(200, OrganizationsMock);

    createTokenPayload = {
      org_uid: "org-123",
      warehouse_project_id: "project-123",
      vintage_year: 2020,
      sequence_num: 1,
      amount: 1,
      to_address: "0x123",
      warehouseUnitId: "unit-123",
    };

    walletHasUnconfirmedTransactionsStub = sinon
      .stub(wallet, "hasUnconfirmedTransactions")
      .resolves(false);

    sinon.stub(registry, "waitForRegistryDataSync").resolves();
    sinon
      .stub(tokenDriver, "waitForTokenizationTransactionConfirmation")
      .resolves(true);
  });

  afterEach(async () => {
    sinon.restore();
    nock.cleanAll();
    await new Promise(resolve => setTimeout(() => resolve(), 1000));
  });

  afterAll(async () => {
    // Close the server gracefully
    await stopServer();
  });

  it("health check", async () => {
    const response = await request(app).get("/health");
    expect(response.status).to.equal(200);
  });

  it("returns a 400 if the wallet has pending transactions", async () => {
    walletHasUnconfirmedTransactionsStub.restore();
    sinon.stub(wallet, "hasUnconfirmedTransactions").resolves(true);

    const response = await request(app)
      .post("/tokenize")
      .send(createTokenPayload);

    expect(response.status).to.equal(400);
  });

  it("Performs the Correct tokenization flow when in Core Registry Mode", async () => {
    // Create a stub for the getConfig method of ConfigManager
    const config = CONFIG();
    config.GENERAL.CORE_REGISTRY_MODE = true;
    setConfig(config);

    // The create token process needs to ensure that the following steps are completed:
    // 1. Call the token driver with the right payload to create a token
    // 2. Call the registry to register the token creation
    // 3. Call the registry to update the unit block with the asset id

    const tokenDriverInterceptor = tokenDriverMock
      .post("/v1/tokens", (body) => {
        expect(body).to.deep.equal({
          token: {
            org_uid: createTokenPayload.org_uid,
            warehouse_project_id: createTokenPayload.warehouse_project_id,
            vintage_year: createTokenPayload.vintage_year,
            sequence_num: createTokenPayload.sequence_num,
          },
          payment: {
            amount: (createTokenPayload.amount || 1) * 1000,
            to_address: createTokenPayload.to_address,
          },
        });
        return true;
      })
      .reply(200, TokenCreatedResponseMock);

    // Nock Registry Add Metadata Response
    const updateRegistryMetadataInterceptor = registryMock
      .post("/v1/organizations/metadata", (body) => {
        const bodyValue = JSON.parse(
          body[TokenCreatedResponseMock.token.asset_id]
        );
        const expectedBodyValue = TokenCreatedResponseMock.token;
        expectedBodyValue.detokenization.mod_hash = "";
        expectedBodyValue.detokenization.public_key = "";
        expectedBodyValue.detokenization.signature = "";

        expect(bodyValue).to.deep.equal(expectedBodyValue);

        return true;
      })
      .reply(200, {
        message: "Home org currently being updated, will be completed soon.",
        success: true,
      });

    // Nock Registry Update Unit Response (1)
    const getUnitInterceptor = registryMock
      .get("/v1/units")
      .query({ warehouseUnitId: createTokenPayload.warehouseUnitId })
      .reply(200, UnitMock);

    // Nock Registry Update Unit Response (2)
    const updateUnitInterceptor = registryMock
      .put("/v1/units", (body) => {
        expect(body).to.deep.equal({
          ...registry.sanitizeUnitForUpdate(UnitMock),
          marketplaceIdentifier: TokenCreatedResponseMock.token.asset_id,
          marketplace: "Tokenized on Chia",
        });
        return true;
      })
      .reply(200, {
        success: true,
      });

    const response = await request(app)
      .post("/tokenize")
      .send(createTokenPayload);

    // Expect a status code 200
    expect(response.status).to.equal(200);

    // Let the event loop continue (simulate asynchronous behavior)
    await new Promise((resolve) => setTimeout(resolve, 5000));

    expect(tokenDriverInterceptor.isDone()).to.be.true;
    expect(updateRegistryMetadataInterceptor.isDone()).to.be.true;
    expect(getUnitInterceptor.isDone()).to.be.true;
    expect(updateUnitInterceptor.isDone()).to.be.true;
  }, 20000);

  it("Performs the Correct tokenization flow when NOT in Core Registry Mode", async () => {
    // Create a stub for the getConfig method of ConfigManager
    const config = CONFIG();
    config.GENERAL.CORE_REGISTRY_MODE = false;
    setConfig(config);

    // The create token process needs to ensure that the following steps are completed:
    // 1. Call the token driver with the right payload to create a token
    // 2. Call the registry to register the token creation
    // 3. Call the registry to update the unit block with the asset id

    const tokenDriverInterceptor = tokenDriverMock
      .post("/v1/tokens", (body) => {
        expect(body).to.deep.equal({
          token: {
            org_uid: createTokenPayload.org_uid,
            warehouse_project_id: createTokenPayload.warehouse_project_id,
            vintage_year: createTokenPayload.vintage_year,
            sequence_num: createTokenPayload.sequence_num,
          },
          payment: {
            amount: (createTokenPayload.amount || 1) * 1000,
            to_address: createTokenPayload.to_address,
          },
        });
        return true;
      })
      .reply(200, TokenCreatedResponseMock);

    // Nock Registry Add Metadata Response
    const updateRegistryMetadataInterceptor = registryMock
      .post("/v1/organizations/metadata", (body) => {
        const bodyValue = JSON.parse(
          body[TokenCreatedResponseMock.token.asset_id]
        );
        const expectedBodyValue = TokenCreatedResponseMock.token;

        expect(bodyValue).to.deep.equal(expectedBodyValue);

        return true;
      })
      .reply(200, {
        message: "Home org currently being updated, will be completed soon.",
        success: true,
      });

    const response = await request(app)
      .post("/tokenize")
      .send(createTokenPayload);

    // Expect a status code 200
    expect(response.status).to.equal(200);

    // Let the event loop continue (simulate asynchronous behavior)
    await new Promise((resolve) => setTimeout(resolve, 5000));

    expect(tokenDriverInterceptor.isDone()).to.be.true;
    expect(updateRegistryMetadataInterceptor.isDone()).to.be.true;
  }, 20000);
});
