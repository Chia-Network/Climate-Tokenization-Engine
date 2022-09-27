"use strict";

const _ = require("lodash");
const express = require("express");
const joiExpress = require("express-joi-validation");
const bodyParser = require("body-parser");
const { createProxyMiddleware } = require("http-proxy-middleware");
const http = require("http");

const validator = joiExpress.createValidator({ passError: true });

const schemas = require("./validations");

const app = express();
const port = 31311;

// TODO: create config.yaml to set this
const registryHost = "http://localhost:31310";

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(
  `/units/tokenized`,
  createProxyMiddleware({
    target: registryHost,
    changeOrigin: true,
    secure: false,
    pathRewrite: {
      [`/units/tokenized`]: "/v1/units?hasMarketplaceIdentifier=true",
    },
  })
);

app.use(
  `/units/untokenized`,
  createProxyMiddleware({
    target: registryHost,
    changeOrigin: true,
    secure: false,
    pathRewrite: {
      [`/units/untokenized`]: "/v1/units?hasMarketplaceIdentifier=false",
    },
  })
);

app.post("/connect", validator.body(schemas.connectToOrgSchema), (req, res) => {
  // Call datalayer get_owned_stores to get all your owned stores
  // check if this orgUid matches one of those entries
  // if no match return 404
  // if match save orgUid to db and use as homeOrg
  const orgUid = req.body.orgUid;
  res.send("Not Yet Implemented");
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
