const _ = require("lodash");
const { logger } = require("./logger");
const { getHomeOrgUid } = require("./api/registry");
const { CONFIG } = require("./config");

/**
 * Error-handling middleware.
 * @param {Object} err - The error object
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {Function} next - The next middleware function
 */
const errorHandler = (err, req, res, next) => {
  logger.error(err);

  if (_.get(err, "error.details")) {
    const errorString = err.error.details.map((detail) => {
      return _.get(detail, "context.message", detail.message);
    });
    return res.status(400).json({
      message: "Data Validation error",
      errors: errorString,
      success: false,
    });
  }

  return res.status(err.status).json(err);
};

/**
 * Middleware to set org UID header.
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {Function} next - The next middleware function
 * @returns {Promise<void>}
 */
const setOrgUidHeader = async (req, res, next) => {
  const homeOrgUid = await getHomeOrgUid();

  if (homeOrgUid) {
    res.header("Access-Control-Expose-Headers", "x-org-uid");
    res.header("x-org-uid", homeOrgUid);
  }

  next();
};

/**
 * Middleware to set the core registry mode header (t/f)
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {Function} next - The next middleware function
 * @returns {Promise<void>}
 */
const setCoreRegistryModeHeader = async (req, res, next) => {
  res.header("Access-Control-Expose-Headers", "x-core-registry-mode");
  res.header("x-core-registry-mode", Boolean(CONFIG()?.GENERAL?.CORE_REGISTRY_MODE));
  next();
};

const assertApiKey = (req, res, next) => {
  const configApiKey = CONFIG()?.TOKENIZATION_ENGINE?.API_KEY;

  if (
    configApiKey &&
    configApiKey !== ""
  ) {
    const reqApiKey = req.header("x-api-key");
    if (configApiKey === reqApiKey) {
      next();
    } else {
      res.status(403).json({
        message: "Tokenization Engine API key not found",
        success: false,
      });
    }
  } else {
    next();
  }
};

const assertHomeOrgExists = async (req, res, next) => {
  // Skip everything if the request is a GET request to /healthz
  if (req.method === "GET" && req.path === "/healthz") {
    return next();
  }

  try {
    const homeOrgUid = await getHomeOrgUid();

    if (homeOrgUid === null) {
      throw new Error(
        "The connected registry does not have a valid Home Org. Please create one to use this software."
      );
    }

    next();
  } catch (err) {
    res.status(400).json({
      message: "Chia Exception",
      error: err.message,
      success: false,
    });
  }
};

module.exports = {
  errorHandler,
  setOrgUidHeader,
  assertApiKey,
  assertHomeOrgExists,
  setCoreRegistryModeHeader
};
