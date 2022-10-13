const Joi = require("joi");

const connectToOrgSchema = Joi.object({
  orgUid: Joi.string().required(),
});

const tokenizeUnitSchema = Joi.object({
  org_uid: Joi.string().required(),
  warehouse_project_id: Joi.string().required(),
  vintage_year: Joi.number().required(),
  sequence_num: Joi.number().required(),
});

module.exports = { connectToOrgSchema, tokenizeUnitSchema };
