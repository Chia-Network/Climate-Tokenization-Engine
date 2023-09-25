const os = require("os");
const express = require("express");
const joiExpress = require("express-joi-validation");
const cors = require("cors");
const { logger } = require("./logger");
const CONFIG = require("./config");
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

// Routes
app.post("/tokenize", validator.body(tokenizeUnitSchema), tokenizeUnit);
app.post("/parse-detok-file", parseDetokFile);
app.post("/confirm-detokanization", confirmDetokanization);

/**
 * Basic health check route.
 *
 * @returns {Object} An object containing a message and timestamp.
 */
app.get("/health", (req, res) => {
  res.status(200).json({
    message: "OK",
    timestamp: new Date().toISOString(),
  });
});

// Initialize server
let shouldListen = false;

// Check if CONFIG.TOKENIZATION_ENGINE.HOST is either "localhost" or "127.0.0.1"
// OR if CONFIG.TOKENIZATION_ENGINE.API_KEY exists.
// In either case, set shouldListen to true.
if (
  ["localhost", "127.0.0.1"].includes(CONFIG.TOKENIZATION_ENGINE.HOST) ||
  CONFIG.TOKENIZATION_ENGINE.API_KEY
) {
  shouldListen = true;
}

if (shouldListen) {
  app.listen(
    CONFIG.TOKENIZATION_ENGINE.PORT,
    CONFIG.TOKENIZATION_ENGINE.HOST,
    () => {
      logger.info(
        `Application is running on port ${CONFIG.TOKENIZATION_ENGINE.PORT}.`
      );
    }
  );

  // Starting the scheduler
  if (CONFIG.GENERAL.CORE_REGISTRY_MODE) {
    setTimeout(() => scheduler.start(), 5000);
  }
} else {
  logger.warn(
    "Server not started due to missing CONFIG.TOKENIZATION_ENGINE.API_KEY on a non-local host."
  );
}
