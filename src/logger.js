const Logger = require("@chia-carbon/core-registry-logger");
const { CONFIG } = require("./config");
const packageJson = require("../package.json");

const logger = new Logger({
  namespace: "core-registry",
  projectName: "tokenization-engine",
  logLevel: CONFIG().GENERAL.LOG_LEVEL,
  packageVersion: packageJson.version,
});

module.exports = { logger };
