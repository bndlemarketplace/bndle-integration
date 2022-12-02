const dotenv = require('dotenv');
const path = require('path');
const Joi = require('joi');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const envVarsSchema = Joi.object()
  .keys({
    EMAIL_FROM: Joi.string().description('email send from'),
  })
  .unknown();
const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

module.exports = {
  emailConfig: {
    emailFrom: envVars.EMAIL_FROM,
    // frontEndUrl: envVars.FRONT_END_URL,
  },
};
