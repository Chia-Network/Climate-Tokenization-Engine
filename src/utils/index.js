const apiUtils = require('./api-utils');
const configLoader = require('./config-loader');
const coreRegApi = require('./coreRegApi');
const decompress  = require('./decompress');
const logger = require('./logger');

module.exports = {
  ...apiUtils,
  ...configLoader,
  ...coreRegApi,
  ...decompress,
  ...logger,
};