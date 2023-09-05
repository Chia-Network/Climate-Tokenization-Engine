"use strict";

const superagent = require("superagent");
const _ = require("lodash");
const express = require("express");
const joiExpress = require("express-joi-validation");
const bodyParser = require("body-parser");
const cors = require("cors");
const os = require("os");
const formData = require("express-form-data");
const scheduler = require("./tasks");

const { getHomeOrgUid } = require("./utils/coreRegApi");

const { createProxyMiddleware } = require("http-proxy-middleware");

const validator = joiExpress.createValidator({ passError: true });

const { updateConfig, getConfig } = require("./utils/config-loader");
const { connectToOrgSchema, tokenizeUnitSchema } = require("./validations.js");
const { getStoreIds } = require("./datalayer.js");
const { logger } = require("./utils/logger");

const app = express();
const port = 31311;
let CONFIG = getConfig();

const headerKeys = Object.freeze({
  ORG_UID: "x-org-uid",
});
app.use(
  cors({
    exposedHeaders: Object.values(headerKeys).join(","),
  })
);

app.use("/*", async (req, res, next) => {
  const homeOrgUid = await getHomeOrgUid();

  if (homeOrgUid) {
    res.header("Access-Control-Expose-Headers", "x-org-uid");
    res.header("x-org-uid", homeOrgUid);
  }

  logger.debug(req.headers, { method: req.method, url: req.url });
  next();
});

const options = {
  uploadDir: os.tmpdir(),
  autoClean: true,
};
app.use(formData.parse(options));
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

// Add optional API key if set in config file
app.use(function (req, res, next) {
  if (
    CONFIG.CLIMATE_TOKENIZATION_ENGINE_API_KEY &&
    CONFIG.CLIMATE_TOKENIZATION_ENGINE_API_KEY !== ""
  ) {
    const apikey = req.header("x-api-key");
    if (CONFIG.CLIMATE_TOKENIZATION_ENGINE_API_KEY === apikey) {
      next();
    } else {
      res.status(403).json({ message: "CTE API key not found" });
    }
  } else {
    next();
  }
});

app.post("/connect", validator.body(connectToOrgSchema), async (req, res) => {
  const orgUid = req.body.orgUid;
  try {
    const storeIds = await getStoreIds(orgUid);

    if (storeIds.includes(orgUid)) {
      updateConfig({ HOME_ORG: orgUid });
      setTimeout(() => {
        CONFIG = getConfig();
      }, 0);
      res.json({ message: "successfully connected" });
    } else {
      throw new Error("orgUid not found");
    }
  } catch (error) {
    res.status(400).json({
      message: "Error connecting orgUid",
      error: error.message,
    });
    logger.error(`Error connecting orgUid ${error.message}`);
  }
});

app.use(async function (req, res, next) {
  try {
    const homeOrgUid = await getHomeOrgUid();

    if (homeOrgUid === null) {
      logger.error(
        "CADT does not contain valid HOME_ORG please create one to use this software"
      );
      throw new Error("Home Org does not exist.");
    }

    next();
  } catch (err) {
    res.status(400).json({
      message: "Chia Exception",
      error: err.message,
    });
  }
});

app.use(
  `/units/tokenized`,
  createProxyMiddleware({
    target: CONFIG.CADT_API_SERVER_HOST,
    changeOrigin: true,
    secure: false,
    pathRewrite: async function (path, req) {
      const homeOrgUid = await getHomeOrgUid();

      const currentUrl = new URL(`${CONFIG.CADT_API_SERVER_HOST}${path}`);

      const newQuery = updateQueryWithParam(
        currentUrl.search,
        {
          param: "hasMarketplaceIdentifier",
          value: true,
        },
        {
          param: "orgUid",
          value: homeOrgUid,
        },
        {
          param: "includeProjectInfoInSearch",
          value: true,
        }
      );

      const newPath = "/v1/units" + newQuery;
      return newPath;
    },
    async onProxyRes(proxyRes, req, res) {
      const homeOrgUid = await getHomeOrgUid();

      if (homeOrgUid) {
        proxyRes.headers["Access-Control-Expose-Headers"] = "x-org-uid";
        proxyRes.headers["x-org-uid"] = homeOrgUid;
      }
    },
    onProxyReq(proxyReq) {
      if (CONFIG.CADT_API_KEY) {
        proxyReq.setHeader("x-api-key", CONFIG.CADT_API_KEY);
      }
    },
  })
);

app.use(
  `/projects`,
  createProxyMiddleware({
    target: CONFIG.CADT_API_SERVER_HOST,
    changeOrigin: true,
    secure: false,
    pathRewrite: async function (path, req) {
      const homeOrgUid = await getHomeOrgUid();
      const currentUrl = new URL(`${CONFIG.CADT_API_SERVER_HOST}${path}`);

      const newQuery = updateQueryWithParam(currentUrl.search, {
        param: "orgUid",
        value: homeOrgUid,
      });

      const newPath = "/v1/projects" + newQuery;
      return newPath;
    },
    async onProxyRes(proxyRes, req, res) {
      const homeOrgUid = await getHomeOrgUid();
      if (homeOrgUid) {
        proxyRes.headers["Access-Control-Expose-Headers"] = "x-org-uid";
        proxyRes.headers["x-org-uid"] = homeOrgUid;
      }
    },
    onProxyReq(proxyReq) {
      if (CONFIG.CADT_API_KEY) {
        proxyReq.setHeader("x-api-key", CONFIG.CADT_API_KEY);
      }
    },
  })
);

app.use(
  `/units/untokenized`,
  createProxyMiddleware({
    target: CONFIG.CADT_API_SERVER_HOST,
    changeOrigin: true,
    secure: false,
    pathRewrite: async function (path, req) {
      const homeOrgUid = await getHomeOrgUid();
      const currentUrl = new URL(`${CONFIG.CADT_API_SERVER_HOST}${path}`);

      const newQuery = updateQueryWithParam(
        currentUrl.search,
        {
          param: "hasMarketplaceIdentifier",
          value: false,
        },
        {
          param: "orgUid",
          value: homeOrgUid,
        },
        {
          param: "includeProjectInfoInSearch",
          value: true,
        },
        {
          param: "filter",
          value: CONFIG.UNITS_FILTER,
        }
      );

      const newPath = "/v1/units" + newQuery;
      return newPath;
    },
    async onProxyRes(proxyRes, req, res) {
      const homeOrgUid = await getHomeOrgUid();
      if (homeOrgUid) {
        proxyRes.headers["Access-Control-Expose-Headers"] = "x-org-uid";
        proxyRes.headers["x-org-uid"] = homeOrgUid;
      }
    },
    onProxyReq(proxyReq) {
      if (CONFIG.CADT_API_KEY) {
        proxyReq.setHeader("x-api-key", CONFIG.CADT_API_KEY);
      }
    },
  })
);

const updateUnitMarketplaceIdentifierWithAssetId = async (
  warehouseUnitId,
  asset_id
) => {
  try {
    const unitToBeUpdatedResponse = await superagent
      .get(`${CONFIG.CADT_API_SERVER_HOST}/v1/units`)
      .query({ warehouseUnitId: warehouseUnitId })
      .set(addCadtApiKeyHeader());

    const unitToBeUpdated = unitToBeUpdatedResponse.body;
    unitToBeUpdated.marketplaceIdentifier = asset_id;
    unitToBeUpdated.marketplace = "Tokenized on Chia";

    delete unitToBeUpdated?.issuance?.orgUid;
    delete unitToBeUpdated.issuanceId;
    delete unitToBeUpdated.orgUid;
    delete unitToBeUpdated.serialNumberBlock;

    Object.keys(unitToBeUpdated).forEach(function (key, index) {
      if (this[key] == null) delete this[key];
    }, unitToBeUpdated);

    let headers = addCadtApiKeyHeader({ "Content-Type": "application/json" });

    const updateUnitResponse = await superagent
      .put(`${CONFIG.CADT_API_SERVER_HOST}/v1/units`)
      .send(unitToBeUpdated)
      .set(headers);

    const data = updateUnitResponse.body;

    await superagent
      .post(`${CONFIG.CADT_API_SERVER_HOST}/v1/staging/commit`)
      .set(headers);
  } catch (error) {
    console.log(
      "Could not update unit marketplace identifier with asset id.",
      error
    );
    logger.error(
      `Could not update unit marketplace identifier with asset id: ${error.message}`
    );
  }
};

const confirmTokenRegistrationOnWarehouse = async (
  token,
  transactionId,
  retry = 0
) => {
  if (retry <= 60) {
    try {
      await new Promise((resolve) => setTimeout(() => resolve(), 30000));

      const response = await superagent
        .get(`${CONFIG.CADT_API_SERVER_HOST}/v1/staging/hasPendingTransactions`)
        .set(addCadtApiKeyHeader());

      const data = response.body;
      const thereAreNoPendingTransactions = data?.confirmed;

      if (thereAreNoPendingTransactions) {
        return true;
      } else {
        await new Promise((resolve) => setTimeout(() => resolve(), 30000));
        return confirmTokenRegistrationOnWarehouse(
          token,
          transactionId,
          retry + 1
        );
      }
    } catch (error) {
      logger.error(
        `Error confirming token registration on warehouse: ${error.message}`
      );
      return false;
    }
  }
  return false;
};

const registerTokenCreationOnClimateWarehouse = async (
  token,
  warehouseUnitId
) => {
  try {
    const response = await superagent
      .post(`${CONFIG.CADT_API_SERVER_HOST}/v1/organizations/metadata`)
      .send({ [token.asset_id]: JSON.stringify(token) })
      .set(addCadtApiKeyHeader({ "Content-Type": "application/json" }));

    const data = response.body;

    if (
      data.message ===
      "Home org currently being updated, will be completed soon."
    ) {
      const isTokenRegistered = await confirmTokenRegistrationOnWarehouse();

      if (isTokenRegistered && CONFIG.UPDATE_CLIMATE_WAREHOUSE) {
        await updateUnitMarketplaceIdentifierWithAssetId(
          warehouseUnitId,
          token.asset_id
        );
      }
    } else {
      logger.error("Could not register token creation on climate warehouse.");
    }
  } catch (error) {
    logger.error(
      `Could not register token creation on climate warehouse: ${error.message}`
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
      await new Promise((resolve) => setTimeout(() => resolve(), 30000));

      const response = await superagent.get(
        `${CONFIG.CLIMATE_TOKENIZATION_CHIA_HOST}/v1/transactions/${transactionId}`
      );

      const data = response.body;
      const isTokenCreationConfirmed = data?.record?.confirmed;

      if (isTokenCreationConfirmed) {
        return true;
      } else {
        await new Promise((resolve) => setTimeout(() => resolve(), 30000));
        return confirmTokenCreationWithTransactionId(
          token,
          transactionId,
          retry + 1
        );
      }
    } catch (error) {
      logger.error(
        `Error confirming token creation with transaction id ${transactionId}: ${error.message}`
      );
      return false;
    }
  }
  return false;
};

app.post("/tokenize", validator.body(tokenizeUnitSchema), async (req, res) => {
  try {
    console.log({
      token: {
        org_uid: req.body.org_uid,
        warehouse_project_id: req.body.warehouse_project_id,
        vintage_year: req.body.vintage_year,
        sequence_num: req.body.sequence_num,
      },
      payment: {
        amount: (req.body.amount || 1) * 1000,
        to_address: req.body.to_address,
      },
    });
    const response = await superagent
      .post(`${CONFIG.CLIMATE_TOKENIZATION_CHIA_HOST}/v1/tokens`)
      .send({
        token: {
          org_uid: req.body.org_uid,
          warehouse_project_id: req.body.warehouse_project_id,
          vintage_year: req.body.vintage_year,
          sequence_num: req.body.sequence_num,
        },
        payment: {
          amount: (req.body.amount || 1) * 1000,
          to_address: req.body.to_address,
        },
      })
      .set({ "Content-Type": "application/json" });

    const data = response.body;
    const isTokenCreationPending = Boolean(data?.tx?.id);

    if (isTokenCreationPending) {
      res.send(
        "Your token is being created and should be ready in a few minutes."
      );

      const isTokenCreationConfirmed =
        await confirmTokenCreationWithTransactionId(data.token, data.tx.id);

      if (isTokenCreationConfirmed) {
        await registerTokenCreationOnClimateWarehouse(
          data.token,
          req.body.warehouseUnitId
        );
      } else {
        console.log("Token creation could not be confirmed.");
      }
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    res.status(400).json({
      message: "Error token could not be created",
      error: error.message,
    });
    logger.error(`Error tokenizing: ${error.message}`);
  }
});

const sendParseDetokRequest = async (detokString) => {
  try {
    const url = `${CONFIG.CLIMATE_TOKENIZATION_CHIA_HOST}/v1/tokens/parse-detokenization?content=${detokString}`;
    const response = await superagent.get(url);

    return response.body;
  } catch (error) {
    throw new Error(`Detokenize api could not process request: ${error}`);
  }
};

const getOrgMetaData = async (orgUid) => {
  try {
    const url = `${CONFIG.CADT_API_SERVER_HOST}/v1/organizations/metadata?orgUid=${orgUid}`;
    const response = await superagent.get(url).set(addCadtApiKeyHeader());

    return response.body;
  } catch (error) {
    logger.error(`Could not get org meta data: ${error.message}`);
    throw new Error(`Could not get org meta data: ${error}`);
  }
};

const getProjectByWarehouseProjectId = async (warehouseProjectId) => {
  try {
    const url = `${CONFIG.CADT_API_SERVER_HOST}/v1/projects?projectIds=${warehouseProjectId}`;
    const response = await superagent.get(url).set(addCadtApiKeyHeader());

    return response.body[0];
  } catch (error) {
    logger.error(`Could not get corresponding project data: ${error.message}`);
    throw new Error(`Could not get corresponding project data: ${error}`);
  }
};

const getTokenizedUnitByAssetId = async (assetId) => {
  try {
    const url = `${CONFIG.CADT_API_SERVER_HOST}/v1/units?marketplaceIdentifiers=${assetId}`;
    const response = await superagent.get(url).set(addCadtApiKeyHeader());

    return response.body;
  } catch (error) {
    logger.error(`Could not get tokenized unit by asset id. ${error.message}`);
    throw new Error(`Could not get tokenized unit by asset id. ${error}`);
  }
};

/**
 * If an API key for the Climate Action Data Trust (CADT) is set in the server configuration, add the API key value to
 * the headers that are sent with a request to the CADT. This function mutates the header object passed in and returns
 * the object for convenience. If no headers are passed to this function, a new dictionary containing just the CADT API
 * key (or an empty dictionary, if the API key is not set) is created and returned. If CADT_API_KEY is not set in the
 * configuration, the header object will not be modified.
 */
const addCadtApiKeyHeader = (headers = {}) => {
  if (CONFIG.CADT_API_KEY) {
    headers["x-api-key"] = CONFIG.CADT_API_KEY;
  }

  return headers;
};

app.post("/parse-detok-file", async (req, res) => {
  try {
    let detokString = req.body.detokString;
    detokString = detokString.replace(/(\r\n|\n|\r)/gm, "");
    const detokStringkIsValid =
      typeof detokString === "string" && detokString.startsWith("detok");
    if (!detokStringkIsValid) {
      throw new Error("Uploaded file not valid.");
    }

    const parseDetokResponse = await sendParseDetokRequest(detokString);
    const isDetokParsed = Boolean(parseDetokResponse?.token?.asset_id);
    if (!isDetokParsed) {
      throw new Error("Could not parse detok file properly.");
    }

    const assetId = parseDetokResponse?.token?.asset_id;
    const unitToBeDetokenizedResponse = await getTokenizedUnitByAssetId(
      assetId
    );
    let unitToBeDetokenized = JSON.parse(unitToBeDetokenizedResponse);
    if (unitToBeDetokenized.length) {
      unitToBeDetokenized = unitToBeDetokenized[0];
    }

    if (parseDetokResponse?.payment?.amount) {
      unitToBeDetokenized.unitCount = parseDetokResponse?.payment?.amount;
    }

    const project = await getProjectByWarehouseProjectId(
      unitToBeDetokenized?.issuance?.warehouseProjectId
    );

    const orgUid = unitToBeDetokenized?.orgUid;

    const orgMetaData = await getOrgMetaData(orgUid);
    const assetIdOrgMetaData = orgMetaData[`meta_${assetId}`];
    const parsedAssetIdOrgMetaData = JSON.parse(assetIdOrgMetaData);

    const responseObject = {
      token: {
        org_uid: orgUid,
        project_id: project.projectId,
        vintage_year: unitToBeDetokenized?.vintageYear,
        sequence_num: 0,
        index: parsedAssetIdOrgMetaData?.index,
        public_key: parsedAssetIdOrgMetaData?.public_key,
        asset_id: assetId,
        warehouse_project_id: project.warehouseProjectId,
      },
      content: detokString,
      unit: unitToBeDetokenized,
    };

    res.send(responseObject);
  } catch (error) {
    res.status(400).json({
      message: "File could not be detokenized.",
      error: error.message,
    });
    logger.error(`File could not be detokenized: ${error.message}`);
  }
});

app.post("/confirm-detokanization", async (req, res) => {
  try {
    const confirmDetokanizationBody = _.cloneDeep(req.body);

    const assetId = confirmDetokanizationBody?.token?.asset_id;
    if (confirmDetokanizationBody.unit) {
      delete confirmDetokanizationBody.unit;
    }

    const confirmDetokanizationResponse = await request({
      method: "put",
      url: `${CONFIG.CLIMATE_TOKENIZATION_CHIA_HOST}/v1/tokens/${assetId}/detokenize`,
      body: JSON.stringify(confirmDetokanizationBody),
      headers: { "Content-Type": "application/json" },
    });

    res.send(confirmDetokanizationResponse);
  } catch (error) {
    res.status(400).json({
      message: "Detokanization could not be confirmed",
      error: error.message,
    });
    logger.error(`Detokanization could not be confirmed: ${error.message}`);
  }
});

app.use((err, req, res, next) => {
  if (err) {
    logger.error(err);

    if (_.get(err, "error.details")) {
      const errorString = err.error.details.map((detail) => {
        return _.get(detail, "context.message", detail.message);
      });

      // format Joi validation errors
      return res.status(400).json({
        message: "Data Validation error",
        errors: errorString,
      });
    }

    return res.status(err.status).json(err);
  }

  next();
});

app.use(async (req, res, next) => {
  const homeOrgUid = await getHomeOrgUid();

  if (homeOrgUid) {
    res.setHeader(headerKeys.ORG_UID, homeOrgUid);
  }

  next();
});

const bindAddress = getConfig().BIND_ADDRESS || "localhost";

if (
  (bindAddress !== "localhost" && CONFIG.CLIMATE_TOKENIZATION_ENGINE_API_KEY) ||
  bindAddress === "localhost"
) {
  app.listen(port, bindAddress, () => {
    console.log(`Application is running on port ${port}.`);
  });

  if (CONFIG.UPDATE_CLIMATE_WAREHOUSE) {
    setTimeout(() => {
      scheduler.start();
    }, 5000);
  }
} else {
  console.log(
    "Server was not started because CLIMATE_TOKENIZATION_ENGINE_API_KEY is not set in config.yaml"
  );
}
