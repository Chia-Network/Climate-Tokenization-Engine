const _ = require("lodash");
const logger = require("./logger");
const { getHomeOrgUid } = require("./utils");

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
    res.setHeader("ORG_UID", homeOrgUid);
  }

  next();
};

module.exports = {
  errorHandler,
  setOrgUidHeader,
};
