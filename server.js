"use strict";

const _ = require("lodash");
const express = require("express");
const joiExpress = require("express-joi-validation");
const bodyParser = require("body-parser");
const { createProxyMiddleware } = require("http-proxy-middleware");
const http = require("http");

const validator = joiExpress.createValidator({ passError: true });

const { updateConfig, getConfig } = require("./utils/config-loader");
const { connectToOrgSchema } = require("./validations.js");
const { getStoreIds } = require("./datalayer.js");

const app = express();
const port = 31311;

const CONFIG = getConfig();

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));

const updateQueryWithParam = (query, param, value) => {
  const currentParams = new URLSearchParams(query);
  if (param) {
    currentParams.append(param, value);
  }
  const newParams = currentParams.toString();
  return `?${newParams}`;
};

app.use(
  `/units/tokenized`,
  createProxyMiddleware({
    target: CONFIG.REGISTRY_HOST,
    changeOrigin: true,
    secure: false,
    pathRewrite: async function (path, req) {
      const currentUrl = new URL(`${CONFIG.REGISTRY_HOST}${path}`);

      const newQuery = updateQueryWithParam(
        currentUrl.search,
        "hasMarketplaceIdentifier",
        true
      );

      const newPath = "/v1/units" + newQuery;
      return newPath;
    },
  })
);

app.use(
  `/projects`,
  createProxyMiddleware({
    target: CONFIG.REGISTRY_HOST,
    changeOrigin: true,
    secure: false,
    pathRewrite: async function (path, req) {
      const currentUrl = new URL(`${CONFIG.REGISTRY_HOST}${path}`);
      const newPath = "/v1/projects" + currentUrl.search;
      return newPath;
    },
  })
);

app.use(
  `/units/untokenized`,
  createProxyMiddleware({
    target: CONFIG.REGISTRY_HOST,
    changeOrigin: true,
    secure: false,
    pathRewrite: async function (path, req) {
      const currentUrl = new URL(`${CONFIG.REGISTRY_HOST}${path}`);

      const newQuery = updateQueryWithParam(
        currentUrl.search,
        "hasMarketplaceIdentifier",
        false
      );

      const newPath = "/v1/units" + newQuery;
      return newPath;
    },
  })
);

app.post("/connect", validator.body(connectToOrgSchema), async (req, res) => {
  const orgUid = req.body.orgUid;
  try {
    const storeIds = await getStoreIds(orgUid);

    if (storeIds.includes(orgUid)) {
      updateConfig({ HOME_ORG: orgUid });
      res.json({ message: "successfully connected" });
    } else {
      throw new Error("orgUid not found");
    }
  } catch (error) {
    res.status(400).json({
      message: "Error connecting orgUid",
      error: error.message,
    });
  }
});

app.get("/tokenize", (req, res) => {
  res.send("Not Yet Implemented");
});

app.use((err, req, res, next) => {
  if (err) {
    if (_.get(err, "error.details")) {
      // format Joi validation errors
      return res.status(400).json({
        message: "Data Validation error",
        errors: err.error.details.map((detail) => {
          return _.get(detail, "context.message", detail.message);
        }),
      });
    }

    return res.status(err.status).json(err);
  }

  next();
});

app.listen(port, () => {
  console.log(`Application is running on port ${port}.`);
});
