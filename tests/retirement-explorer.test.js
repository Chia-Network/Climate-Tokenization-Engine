const nock = require("nock");
const { getHomeOrgRetirementActivities } = require("../src/api/retirement-explorer");
const { CONFIG } = require("../src/config");
const { generateUriForHostAndPort } = require("../src/utils");
const HomeOrgMock = require("./data/HomeOrgMock");
const OrganizationsMock = require("./data/OrganizationsMock");

const retirementExplorerUri = generateUriForHostAndPort(
  CONFIG().RETIREMENT_EXPLORER.PROTOCOL,
  CONFIG().RETIREMENT_EXPLORER.HOST,
  CONFIG().RETIREMENT_EXPLORER.PORT
);

const registryUri = generateUriForHostAndPort(
  CONFIG().CADT.PROTOCOL,
  CONFIG().CADT.HOST,
  CONFIG().CADT.PORT
);

describe("getHomeOrgRetirementActivities", () => {
  const apiEndpoint = retirementExplorerUri;
  const mockResponse = {
    activities: [
      { mode: "PERMISSIONLESS_RETIREMENT", someField: "someValue" },
      { mode: "TOKENIZATION", someField: "someOtherValue" },
    ],
  };

  beforeEach(() => {
    nock(apiEndpoint)
      .get("/v1/activities")
      .query({ page: 1, limit: 10, org_uid: HomeOrgMock.orgUid, minHeight: 1, sort: "asc" })
      .reply(200, mockResponse);

    nock(registryUri).get("/v1/organizations").reply(200, OrganizationsMock);
  });

  it('should filter out activities that do not have a mode of "PERMISSIONLESS_RETIREMENT"', async () => {
    const result = await getHomeOrgRetirementActivities(1, 10, 0);
    expect(result).toEqual([
      { mode: "PERMISSIONLESS_RETIREMENT", someField: "someValue" },
    ]);
  });

  it("should handle API errors gracefully", async () => {
    nock.cleanAll();
    nock(apiEndpoint).get("/retirement-activities").replyWithError("API Error");

    const result = await getHomeOrgRetirementActivities(1, 10, 0);
    expect(result).toEqual([]);
  });
});
