const Logger = require("@chia-carbon/core-registry-logger");
const CONFIG = require("./config");
const packageJson = require("../package.json");

const logger = new Logger({
  projectName: "tokenization-engine",
  logLevel: CONFIG.LOG_LEVEL,
  packageVersion: packageJson.version,
});

module.exports = { logger };
