const _ = require("lodash");
const yaml = require("js-yaml");
const fs = require("fs");
const os = require("os");
const path = require("path");

const defaultConfig = require("./defaultConfig.json");
const homeDir = os.homedir();
const persistanceFolderPath = `${homeDir}/.chia/climate-portal`;
const configFilePath = path.resolve(`${persistanceFolderPath}/config.yaml`);

const getConfig = () => {
  try {
    if (!fs.existsSync(configFilePath)) {
      try {
        if (!fs.existsSync(persistanceFolderPath)) {
          fs.mkdirSync(persistanceFolderPath, { recursive: true });
        }

        fs.writeFileSync(configFilePath, yaml.dump(defaultConfig), "utf8");
      } catch (err) {
        return defaultConfig;
      }
    }

    try {
      const yml = yaml.load(fs.readFileSync(configFilePath, "utf8"));
      return yml;
    } catch (e) {
      console.log(`Config file not found at ${configFilePath}`, e);
    }
  } catch (e) {
    console.log(`Config file not found at ${configFilePath}`, e);
  }
};

const updateConfig = (updates) => {
  try {
    const currentConfig = getConfig();
    const updatedConfig = { ...currentConfig, ...updates };
    fs.writeFileSync(configFilePath, yaml.dump(updatedConfig), "utf8");
  } catch (e) {
    console.log(`Could not update config file`, e);
  }
};

module.exports = { getConfig, updateConfig };
