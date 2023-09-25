const ConfigManager = require("@chia-carbon/core-registry-config");
const defaultConfig = require("./utils/defaultConfig.json");
const configManager = new ConfigManager('carbon', defaultConfig);

const CONFIG = configManager.config;

module.exports = CONFIG;
