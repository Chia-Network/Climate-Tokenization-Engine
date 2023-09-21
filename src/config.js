const dotenv = require("dotenv");
dotenv.config();

const CONFIG = {
  // General
  BIND_ADDRESS: process.env.BIND_ADDRESS || "localhost",
  PORT: process.env.PORT || 3000,
  CLIMATE_TOKENIZATION_ENGINE_API_KEY:
    process.env.CLIMATE_TOKENIZATION_ENGINE_API_KEY,

  // API Endpoints
  CLIMATE_TOKENIZATION_CHIA_HOST: process.env.CLIMATE_TOKENIZATION_CHIA_HOST,
  CADT_API_SERVER_HOST: process.env.CADT_API_SERVER_HOST,

  // CADT
  CADT_API_KEY: process.env.CADT_API_KEY,

  // Other configurations
  CORE_REGISTRY_MODE: process.env.CORE_REGISTRY_MODE === "true",
};

module.exports = CONFIG;
