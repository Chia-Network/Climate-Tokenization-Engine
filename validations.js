import Joi from "joi";

const connectToOrgSchema = Joi.object({
    orgUid: Joi.string().required(),
  })

export {
  connectToOrgSchema
};
