const Joi = require("joi");

module.exports = {
  connectToOrgSchema: Joi.object({
    orgUid: Joi.string().required(),
  }),
};
