"use strict";

const winston = require('winston');
require('winston-daily-rotate-file');
const { getChiaRoot, getConfig } = require('./config-loader');
const fs = require('fs');

const { combine, timestamp, json } = winston.format;


const createLogger = () => {
    const logLocation = `${getChiaRoot()}/climate-portal/logs`;
    const logRetentionDays = `${getConfig().LOG_RETENTION_DAYS || 30}d`;

    try {
        if (!fs.existsSync(logLocation)) {
            fs.mkdirSync(logLocation, {recursive: true});
        }

        return winston.createLogger({
            level:  getConfig().LOG_LEVEL || process.env.LOG_LEVEL || 'info',
            format: combine(timestamp(), json()),
            transports: [
                new winston.transports.DailyRotateFile({
                    filename: logLocation + '/combined-%DATE%.log',
                    datePattern: 'YYYY-MM-DD',
                    maxFiles: logRetentionDays,
                }),
                new winston.transports.DailyRotateFile({
                    filename: logLocation + '/error-%DATE%.log',
                    datePattern: 'YYYY-MM-DD',
                    maxFiles: logRetentionDays,
                    level: 'error'
                }),
            ],
        });
    } catch (err) {
        console.log("WARNING: could not create logs at location " + logLocation + ", writing logs to console.");
        return winston.createLogger({
            level: getConfig().LOG_LEVEL || process.env.LOG_LEVEL || 'info',
            format: winston.format.json(),
            transports: [new winston.transports.Console()],
        });
    }
}

const logger = createLogger();


module.exports = {logger}