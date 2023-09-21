const express = require("express");
const logger = require("./logger");
const config = require("./config");
const { validateBody } = require("./validation");
const { tokenizeUnit, confirmTokenCreation } = require("./tokenization");
const { parseDetokFile, confirmDetokanization } = require("./detokenization");
const { errorHandler, setHomeOrgUidHeader } = require("./middleware");
const scheduler = require("./tasks");
const setupProxyMiddleware = require("./proxy");
const bodyParser = require("body-parser");

const app = express();
const port = config.PORT;
const BIND_ADDRESS = config.BIND_ADDRESS;

// Middleware
app.use(bodyParser.json());
app.use(setHomeOrgUidHeader);

// Routes
app.post("/tokenize", validateBody(tokenizeUnitSchema), tokenizeUnit);
app.post("/parse-detok-file", parseDetokFile);
app.post("/confirm-detokanization", confirmDetokanization);
setupProxyMiddleware();

// Error handling
app.use(errorHandler);

// Initialize server
const shouldListen =
  BIND_ADDRESS === "localhost" || config.CLIMATE_TOKENIZATION_ENGINE_API_KEY;

if (shouldListen) {
  app.listen(port, BIND_ADDRESS, () => {
    logger.info(`Application is running on port ${port}.`);
  });

  // Starting the scheduler
  if (config.CORE_REGISTRY_MODE) {
    setTimeout(() => scheduler.start(), 5000);
  }
} else {
  console.log(
    "Server was not started because CLIMATE_TOKENIZATION_ENGINE_API_KEY is not set in config.yaml"
  );
}
