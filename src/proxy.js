const { createProxyMiddleware, fixRequestBody } = require("http-proxy-middleware");
const { getHomeOrgUid } = require("./api/registry");
const { updateQueryWithParam, generateUriForHostAndPort } = require("./utils");
const { CONFIG } = require("./config");
const { createAddress } = require("./api/address-book");

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
        { param: "onlyTokenizedUnits", value: true },
        { param: "orgUid", value: homeOrgUid }
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
        { param: "onlyTokenizedUnits", value: false },
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

const getOrganizationsFromRegistry = () => {
  return createProxyMiddleware({
    target: registryUri,
    changeOrigin: true,
    secure: false,
    pathRewrite: async (path) => {
      const homeOrgUid = await getHomeOrgUid();
      return "/v1/organizations";
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

const createAddressInAddressBook = () => {
  return createProxyMiddleware({
    target: registryUri,
    changeOrigin: true,
    secure: false,
    pathRewrite: (path) => {
      console.log('Rewriting path:', path);
      const currentUrl = new URL(`${registryUri}${path}`);
      const newQuery = updateQueryWithParam(
        currentUrl.search,
      );
      return `/v1/addressBook${newQuery}`;
    },
    onProxyReq: (proxyReq, req) => {
      console.log('Proxying request to:', registryUri, proxyReq.path, proxyReq.method);
      if (CONFIG().CADT.API_KEY) {
        proxyReq.setHeader('x-api-key', CONFIG().CADT.API_KEY);
        console.log('Added x-api-key header');
      }
      // @ts-ignore
      fixRequestBody(proxyReq, req)
    },
    onProxyRes: async (proxyRes) => {
      try {
        console.log('Response received with status:', proxyRes.statusCode);
        const homeOrgUid = await getHomeOrgUid();
        console.log('Home Org', homeOrgUid)
        if (homeOrgUid) {
          proxyRes.headers['Access-Control-Expose-Headers'] = 'x-org-uid';
          proxyRes.headers['x-org-uid'] = homeOrgUid;
          console.log('Added custom response headers');
        }
      } catch (err) {
        console.error('Error in onProxyRes:', err.message);
      }
    },
    onError: (err, req, res) => {
      console.error('Error encountered in proxy:', err.message);
      // @ts-ignore
      res.sendStatus(500);
    },
  });
};


module.exports = {
  getTokenizedUnits,
  getProjectsFromRegistry,
  getUntokenizedUnits,
  getOrganizationsFromRegistry,
  createAddressInAddressBook
};
