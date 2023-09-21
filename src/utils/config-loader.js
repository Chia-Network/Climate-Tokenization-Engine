const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const { getChiaRoot } = require("chia-root-resolver");

/**
 * Default configuration object
 * @type {object}
 */
const defaultConfig = require("./defaultConfig.json");

/**
 * Chia root directory
 * @type {string}
 */
const chiaRoot = getChiaRoot();

/**
 * Path for persistence folder
 * @type {string}
 */
const persistanceFolderPath = `${chiaRoot}/climate-tokenization-engine`;

/**
 * Path for the configuration file
 * @type {string}
 */
const configFilePath = path.resolve(`${persistanceFolderPath}/config.yaml`);

/**
 * Load configuration from file or return default
 * @returns {object} Configuration object
 */
const getConfig = () => {
  try {
    if (!fs.existsSync(configFilePath)) {
      if (!fs.existsSync(persistanceFolderPath)) {
        fs.mkdirSync(persistanceFolderPath, { recursive: true });
      }
      fs.writeFileSync(configFilePath, yaml.dump(defaultConfig), "utf8");
    }
    return yaml.load(fs.readFileSync(configFilePath, "utf8"));
  } catch (e) {
    console.log(`Config file not found at ${configFilePath}`, e);
    return defaultConfig;
  }
};

/**
 * Update the configuration file with new settings
 * @param {object} updates New settings
 */
const updateConfig = (updates) => {
  try {
    const updatedConfig = { ...getConfig(), ...updates };
    fs.writeFileSync(configFilePath, yaml.dump(updatedConfig), "utf8");
  } catch (e) {
    console.log(`Could not update config file`, e);
  }
};

module.exports = { getConfig, updateConfig, getChiaRoot };
