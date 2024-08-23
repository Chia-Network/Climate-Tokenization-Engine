const os = require("os");
const express = require("express");
const joiExpress = require("express-joi-validation");
const cors = require("cors");
const { logger } = require("./logger");
const { CONFIG } = require("./config");
const { tokenizeUnitSchema } = require("./validations");

const {
  tokenizeUnit,
  parseDetokFile,
  confirmDetokanization,
} = require("./controllers");

const {
  errorHandler,
  setOrgUidHeader,
  assertApiKey,
  assertHomeOrgExists,
} = require("./middleware");

const scheduler = require("./tasks");
const proxy = require("./proxy");
const bodyParser = require("body-parser");
const formData = require("express-form-data");

const app = express();
const validator = joiExpress.createValidator({ passError: true });

// Middleware
const options = {
  uploadDir: os.tmpdir(),
  autoClean: true,
};

app.use(formData.parse(options));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

app.use(assertHomeOrgExists);
app.use(setOrgUidHeader);
app.use(assertApiKey);
app.use(errorHandler);

// proxy routes
app.use("/units/tokenized", proxy.getTokenizedUnits());
app.use("/projects", proxy.getProjectsFromRegistry());
app.use("/units/untokenized", proxy.getUntokenizedUnits());
app.use("/organizations", proxy.getOrganizationsFromRegistry());

// Routes
app.post("/tokenize", validator.body(tokenizeUnitSchema), tokenizeUnit);
app.post("/parse-detok-file", parseDetokFile);
app.post("/confirm-detokanization", confirmDetokanization);

/**
 * Basic health check route.
 *
 * @returns {Object} An object containing a message and timestamp.
 */
app.get("/healthz", (req, res) => {
  res.status(200).json({
    message: "OK",
    timestamp: new Date().toISOString(),
  });
});

// Initialize server
let server;

const startServer = () => {
  server = app.listen(
    CONFIG().TOKENIZATION_ENGINE.PORT,
    CONFIG().TOKENIZATION_ENGINE.BIND_ADDRESS,
    () => {
      logger.info(
        `Application is running on port ${CONFIG().TOKENIZATION_ENGINE.PORT}.`
      );
    }
  );

  // Starting the scheduler
  if (CONFIG().GENERAL.CORE_REGISTRY_MODE) {
    setTimeout(() => scheduler.start(), 5000);
  }
};

const stopServer = () => {
  if (server) {
    server.close((err) => {
      if (err) {
        logger.error("Error closing server:", err);
      } else {
        logger.info("Server closed gracefully.");
      }
    });
  }
};

let shouldListen = false;

// Check if CONFIG.TOKENIZATION_ENGINE.BIND_ADDRESS is either "localhost" or "127.0.0.1"
// OR if CONFIG.TOKENIZATION_ENGINE.API_KEY exists.
// In either case, set shouldListen to true.
if (
  ["localhost", "127.0.0.1"].includes(
    CONFIG().TOKENIZATION_ENGINE.BIND_ADDRESS
  ) ||
  CONFIG().TOKENIZATION_ENGINE.API_KEY
) {
  shouldListen = true;
}

if (shouldListen) {
  startServer();
} else {
  logger.warn(
    "Server not started due to missing CONFIG.TOKENIZATION_ENGINE.API_KEY on a non-local host."
  );
}

// Export the start and stop server functions
module.exports = {
  app,
  startServer,
  stopServer,
};
