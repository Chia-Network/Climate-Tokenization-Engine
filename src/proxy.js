const { createProxyMiddleware } = require("http-proxy-middleware");
const { getHomeOrgUid } = require("./api/registry");
const { updateQueryWithParam, generateUriForHostAndPort } = require("./utils");
const { CONFIG } = require("./config");

const registryUri = generateUriForHostAndPort(
  CONFIG().CADT.PROTOCOL,
  CONFIG().CADT.HOST,
  CONFIG().CADT.PORT
);

const getTokenizedUnits = () => {
  return createProxyMiddleware({
    target: registryUri,
    changeOrigin: true,
    secure: false,
    pathRewrite: async (path) => {
      const homeOrgUid = await getHomeOrgUid();
      const currentUrl = new URL(`${registryUri}${path}`);
      const newQuery = updateQueryWithParam(
        currentUrl.search,
        { param: "hasMarketplaceIdentifier", value: true },
        { param: "orgUid", value: homeOrgUid },
        { param: "includeProjectInfoInSearch", value: true }
      );
      return "/v1/units" + newQuery;
    },
    onProxyReq: (proxyReq) => {
      if (CONFIG().CADT.API_KEY) {
        proxyReq.setHeader("x-api-key", CONFIG().CADT.API_KEY);
      }
    },
    onProxyRes: async (proxyRes) => {
      const homeOrgUid = await getHomeOrgUid();
      if (homeOrgUid) {
        proxyRes.headers["Access-Control-Expose-Headers"] = "x-org-uid";
        proxyRes.headers["x-org-uid"] = homeOrgUid;
      }
    },
  });
};

const getProjectsFromRegistry = () => {
  return createProxyMiddleware({
    target: registryUri,
    changeOrigin: true,
    secure: false,
    pathRewrite: async (path) => {
      const homeOrgUid = await getHomeOrgUid();
      const currentUrl = new URL(`${registryUri}${path}`);
      const newQuery = updateQueryWithParam(currentUrl.search, {
        param: "orgUid",
        value: homeOrgUid,
      });
      return "/v1/projects" + newQuery;
    },
    onProxyReq: (proxyReq) => {
      if (CONFIG().CADT.API_KEY) {
        proxyReq.setHeader("x-api-key", CONFIG().CADT.API_KEY);
      }
    },
    onProxyRes: async (proxyRes) => {
      const homeOrgUid = await getHomeOrgUid();
      if (homeOrgUid) {
        proxyRes.headers["Access-Control-Expose-Headers"] = "x-org-uid";
        proxyRes.headers["x-org-uid"] = homeOrgUid;
      }
    },
  });
};

const getUntokenizedUnits = () => {
  return createProxyMiddleware({
    target: registryUri,
    changeOrigin: true,
    secure: false,
    pathRewrite: async (path) => {
      const homeOrgUid = await getHomeOrgUid();
      const currentUrl = new URL(`${registryUri}${path}`);
      const newQuery = updateQueryWithParam(
        currentUrl.search,
        { param: "hasMarketplaceIdentifier", value: false },
        { param: "orgUid", value: homeOrgUid },
        { param: "includeProjectInfoInSearch", value: true },
        { param: "filter", value: CONFIG().TOKENIZATION_ENGINE.UNITS_FILTER }
      );
      return "/v1/units" + newQuery;
    },
    onProxyReq: (proxyReq) => {
      if (CONFIG().CADT.API_KEY) {
        proxyReq.setHeader("x-api-key", CONFIG().CADT.API_KEY);
      }
    },
    onProxyRes: async (proxyRes) => {
      const homeOrgUid = await getHomeOrgUid();
      if (homeOrgUid) {
        proxyRes.headers["Access-Control-Expose-Headers"] = "x-org-uid";
        proxyRes.headers["x-org-uid"] = homeOrgUid;
      }
    },
  });
};

module.exports = {
  getTokenizedUnits,
  getProjectsFromRegistry,
  getUntokenizedUnits,
};
