"use strict";

const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const http = require("http");

const app = express();
const port = 31311;

// TODO: create config.yaml to set this
const registryHost = "http://localhost:31310";

app.use(
  `/units/tokenized`,
  createProxyMiddleware({
    target: registryHost,
    changeOrigin: true,
    secure: false,
    pathRewrite: {
      [`/units/tokenized`]:
        "/v1/units?hasMarketplaceIdentifier=true",
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

app.get('/connect', (req, res) => {
  res.send("Not Yet Implemented");
})

app.get("/tokenize", (req, res) => {
  res.send("Not Yet Implemented");
});

app.listen(port, () => {
  console.log(`Application is running on port ${port}.`);
});
