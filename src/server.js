const os = require('os');
const express = require("express");
const { logger } = require("./logger");
const CONFIG = require("./config");
//const { tokenizeUnitSchema } = require("./validations");

const {
  tokenizeUnit,
  parseDetokFile,
  confirmDetokanization,
} = require("./controllers");

const {
  errorHandler,
  setOrgUidHeader,
  setOptionalRegistryApiKey,
  assertHomeOrgExists,
  addCadtApiKeyHeader,
} = require("./middleware");

const scheduler = require("./tasks");
const setupProxyMiddleware = require("./proxy");
const bodyParser = require("body-parser");
const formData = require("express-form-data");

const app = express();
const port = CONFIG.CLIMATE_TOKENIZATION_ENGINE_PORT;

// Middleware
const options = {
  uploadDir: os.tmpdir(),
  autoClean: true,
};

app.use(formData.parse(options));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(assertHomeOrgExists);
app.use(setOrgUidHeader);
app.use(setOptionalRegistryApiKey);
app.use(addCadtApiKeyHeader);

setupProxyMiddleware(app);

// Routes
app.post("/tokenize", tokenizeUnit);
app.post("/parse-detok-file", parseDetokFile);
app.post("/confirm-detokanization", confirmDetokanization);

// Error handling
app.use(errorHandler);

// Initialize server
let shouldListen = false;

if (CONFIG.BIND_ADDRESS !== "localhost") {
  if (CONFIG.CLIMATE_TOKENIZATION_ENGINE_API_KEY) {
    shouldListen = true;
  }
}

if (shouldListen) {
  app.listen(port, CONFIG.BIND_ADDRESS, () => {
    logger.info(`Application is running on port ${port}.`);
  });

  // Starting the scheduler
  if (CONFIG.CORE_REGISTRY_MODE) {
    setTimeout(() => scheduler.start(), 5000);
  }
} else {
  logger.warn(
    "Server was not started because CLIMATE_TOKENIZATION_ENGINE_API_KEY is not set in config.yaml"
  );
}
