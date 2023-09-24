const _ = require("lodash");
const { logger } = require("./logger");
const { getHomeOrgUid } = require("./api/registry");
const CONFIG = require("./config");

/**
 * Error-handling middleware.
 * @param {Error} err - The error object
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

const setOptionalRegistryApiKey = (req, res, next) => {
  if (
    CONFIG.TOKENIZATION_ENGINE.API_KEY &&
    CONFIG.TOKENIZATION_ENGINE.API_KEY !== ""
  ) {
    const apikey = req.header("x-api-key");
    if (CONFIG.TOKENIZATION_ENGINE.API_KEY === apikey) {
      next();
    } else {
      res.status(403).json({ message: "CTE API key not found" });
    }
  } else {
    next();
  }
};

const assertHomeOrgExists = async (req, res, next) => {
  try {
    const homeOrgUid = await getHomeOrgUid();

    if (homeOrgUid === null) {
      logger.error(
        "CADT does not contain valid HOME_ORG please create one to use this software"
      );
      throw new Error("Home Org does not exist.");
    }

    next();
  } catch (err) {
    res.status(400).json({
      message: "Chia Exception",
      error: err.message,
    });
  }
};

module.exports = {
  errorHandler,
  setOrgUidHeader,
  setOptionalRegistryApiKey,
  assertHomeOrgExists
};
