const { createProxyMiddleware } = require("http-proxy-middleware");
const { getHomeOrgUid } = require("./api/registry");
const { updateQueryWithParam } = require("./utils");
const CONFIG = require("./config");

/**
 * Setup proxy middleware for various routes.
 * @param {Express.Application} app - The express application
 */
const setupProxyMiddleware = (app) => {
  // Proxy for /units/tokenized
  app.use(
    "/units/tokenized",
    createProxyMiddleware({
      target: CONFIG.CADT_API_SERVER_HOST,
      changeOrigin: true,
      secure: false,
      pathRewrite: async (path) => {
        const homeOrgUid = await getHomeOrgUid();
        const currentUrl = new URL(`${CONFIG.CADT_API_SERVER_HOST}${path}`);
        const newQuery = updateQueryWithParam(
          currentUrl.search,
          { param: "hasMarketplaceIdentifier", value: true },
          { param: "orgUid", value: homeOrgUid },
          { param: "includeProjectInfoInSearch", value: true }
        );
        return "/v1/units" + newQuery;
      },
      onProxyReq: (proxyReq) => {
        if (CONFIG.CADT_API_KEY) {
          proxyReq.setHeader("x-api-key", CONFIG.CADT_API_KEY);
        }
      },
      onProxyRes: async (proxyRes) => {
        const homeOrgUid = await getHomeOrgUid();
        if (homeOrgUid) {
          proxyRes.headers["Access-Control-Expose-Headers"] = "x-org-uid";
          proxyRes.headers["x-org-uid"] = homeOrgUid;
        }
      },
    })
  );

  // Proxy for /projects
  app.use(
    "/projects",
    createProxyMiddleware({
      target: CONFIG.CADT_API_SERVER_HOST,
      changeOrigin: true,
      secure: false,
      pathRewrite: async (path) => {
        const homeOrgUid = await getHomeOrgUid();
        const currentUrl = new URL(`${CONFIG.CADT_API_SERVER_HOST}${path}`);
        const newQuery = updateQueryWithParam(currentUrl.search, {
          param: "orgUid",
          value: homeOrgUid,
        });
        return "/v1/projects" + newQuery;
      },
      onProxyReq: (proxyReq) => {
        if (CONFIG.CADT_API_KEY) {
          proxyReq.setHeader("x-api-key", CONFIG.CADT_API_KEY);
        }
      },
      onProxyRes: async (proxyRes) => {
        const homeOrgUid = await getHomeOrgUid();
        if (homeOrgUid) {
          proxyRes.headers["Access-Control-Expose-Headers"] = "x-org-uid";
          proxyRes.headers["x-org-uid"] = homeOrgUid;
        }
      },
    })
  );

  // Proxy for /units/untokenized
  app.use(
    "/units/untokenized",
    createProxyMiddleware({
      target: CONFIG.CADT_API_SERVER_HOST,
      changeOrigin: true,
      secure: false,
      pathRewrite: async (path) => {
        const homeOrgUid = await getHomeOrgUid();
        const currentUrl = new URL(`${CONFIG.CADT_API_SERVER_HOST}${path}`);
        const newQuery = updateQueryWithParam(
          currentUrl.search,
          { param: "hasMarketplaceIdentifier", value: false },
          { param: "orgUid", value: homeOrgUid },
          { param: "includeProjectInfoInSearch", value: true },
          { param: "filter", value: CONFIG.UNITS_FILTER }
        );
        return "/v1/units" + newQuery;
      },
      onProxyReq: (proxyReq) => {
        if (CONFIG.CADT_API_KEY) {
          proxyReq.setHeader("x-api-key", CONFIG.CADT_API_KEY);
        }
      },
      onProxyRes: async (proxyRes) => {
        const homeOrgUid = await getHomeOrgUid();
        if (homeOrgUid) {
          proxyRes.headers["Access-Control-Expose-Headers"] = "x-org-uid";
          proxyRes.headers["x-org-uid"] = homeOrgUid;
        }
      },
    })
  );
};

module.exports = setupProxyMiddleware;
