const ConfigManager = require("@chia-carbon/core-registry-config");
const defaultConfig = require("./utils/defaultConfig.json");
const configManager = new ConfigManager("core-registry", defaultConfig);

const CONFIG = configManager.config;

let exportedConfig = process.env.NODE_ENV === "test" ? defaultConfig : CONFIG;

module.exports = {
  CONFIG: () => {
    return exportedConfig;
  },
  setConfig: (config) => {
    exportedConfig = config;
  },
};
