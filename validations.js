const Joi = require("joi");

const connectToOrgSchema = Joi.object({
  orgUid: Joi.string().required(),
});

module.exports = { connectToOrgSchema };
