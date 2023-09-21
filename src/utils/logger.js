"use strict";

const winston = require("winston");
require("winston-daily-rotate-file");
const { getChiaRoot, getConfig } = require("./config-loader");
const fs = require("fs");
const { combine, timestamp, json } = winston.format;

/**
 * Create and configure the logger
 *
 * @returns {winston.Logger} Configured logger
 */
const createLogger = () => {
  // Set log location and retention days
  const logLocation = `${getChiaRoot()}/climate-tokenization-engine/logs`;
  const logRetentionDays = `${getConfig().LOG_RETENTION_DAYS || 30}d`;

  try {
    // Create log directory if it doesn't exist
    if (!fs.existsSync(logLocation)) {
      fs.mkdirSync(logLocation, { recursive: true });
    }

    // Create a winston logger with file rotation
    return winston.createLogger({
      level: getConfig().LOG_LEVEL || process.env.LOG_LEVEL || "info",
      format: combine(timestamp(), json()),
      transports: [
        new winston.transports.DailyRotateFile({
          filename: `${logLocation}/combined-%DATE%.log`,
          datePattern: "YYYY-MM-DD",
          maxFiles: logRetentionDays,
        }),
        new winston.transports.DailyRotateFile({
          filename: `${logLocation}/error-%DATE%.log`,
          datePattern: "YYYY-MM-DD",
          maxFiles: logRetentionDays,
          level: "error",
        }),
      ],
    });
  } catch (err) {
    console.log(
      `WARNING: could not create logs at location ${logLocation}, writing logs to console.`
    );
    // Fallback to console logging if file creation fails
    return winston.createLogger({
      level: getConfig().LOG_LEVEL || process.env.LOG_LEVEL || "info",
      format: winston.format.json(),
      transports: [new winston.transports.Console()],
    });
  }
};

/**
 * The main logger instance
 * @type {winston.Logger}
 */
const logger = createLogger();

module.exports = { logger };
