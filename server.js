"use strict";

const request = require("request-promise");
const _ = require("lodash");
const express = require("express");
const joiExpress = require("express-joi-validation");
const bodyParser = require("body-parser");
const { createProxyMiddleware } = require("http-proxy-middleware");
const http = require("http");

const validator = joiExpress.createValidator({ passError: true });

const { updateConfig, getConfig } = require("./utils/config-loader");
const { connectToOrgSchema, tokenizeUnitSchema } = require("./validations.js");
const { getStoreIds } = require("./datalayer.js");

const app = express();
const port = 31311;

const CONFIG = getConfig();

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));

const updateQueryWithParam = (query, ...params) => {
  const currentParams = new URLSearchParams(query);
  params.forEach((paramItem) => {
    if (paramItem) {
      currentParams.append(paramItem.param, paramItem.value);
    }
  });
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
        {
          param: "hasMarketplaceIdentifier",
          value: true,
        },
        {
          param: "orgUid",
          value: CONFIG.HOME_ORG,
        }
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

      const newQuery = updateQueryWithParam(currentUrl.search, {
        param: "orgUid",
        value: CONFIG.HOME_ORG,
      });

      const newPath = "/v1/projects" + newQuery;
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
        {
          param: "hasMarketplaceIdentifier",
          value: false,
        },
        {
          param: "orgUid",
          value: CONFIG.HOME_ORG,
        }
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

const registerTokenCreationOnClimateWarehouse = async (token) => {
  try {
    const response = await request({
      url: `${CONFIG.REGISTRY_HOST}/v1/organizations/metadata`,
      method: "post",
      body: JSON.stringify({
        [token.asset_id]: token,
      }),
    });

    const data = JSON.parse(response);
    console.log("data", data);
  } catch (error) {
    console.log(
      "Could not register token creation on climate warehouse.",
      error.message
    );
  }
};

const confirmTokenCreationWithTransactionId = async (
  token,
  transactionId,
  retry = 0
) => {
  if (retry <= 60) {
    try {
      const response = await request({
        method: "get",
        url: `${CONFIG.TOKENIZE_DRIVER_HOST}/v1/transactions/${transactionId}`,
      });

      const data = JSON.parse(response);
      const isTokenCreationConfirmed = data?.record?.confirmed;

      if (isTokenCreationConfirmed) {
        registerTokenCreationOnClimateWarehouse(token);
      } else {
        await new Promise((resolve) => setTimeout(() => resolve(), 30000));
        await confirmTokenCreationWithTransactionId(
          token,
          transactionId,
          retry + 1
        );
      }
    } catch (error) {
      console.log("Error token creation could not be confirmed", error.message);
    }
  }
};

app.get("/tokenize", validator.body(tokenizeUnitSchema), async (req, res) => {
  try {
    const tokenizeRequestOptions = {
      url: `${CONFIG.TOKENIZE_DRIVER_HOST}/v1/tokens`,
      method: "post",
      body: JSON.stringify({
        token: req.body,
        payment: {
          amount: 100,
          fee: 100,
          to_address:
            "txch1clzn09v7lapulm7j8mwx9jaqh35uh7jzjeukpv7pj50tv80zze4s5060sx",
        },
      }),
      headers: { "Content-Type": "application/json" },
    };

    const response = await request(tokenizeRequestOptions);
    const data = JSON.parse(response);
    const isTokenCreationPending = !!data?.tx?.id;

    if (isTokenCreationPending) {
      res.send(
        "Your token is being created and should be ready in a few minutes."
      );

      await confirmTokenCreationWithTransactionId(data.token, data.tx.id);
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    res.status(400).json({
      message: "Error token could not be created",
      error: error.message,
    });
  }
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
