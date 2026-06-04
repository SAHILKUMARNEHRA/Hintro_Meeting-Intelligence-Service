const dotenv = require('dotenv');

dotenv.config({ quiet: true });

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function optional(name, fallback = undefined) {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  return value;
}

const env = {
  NODE_ENV: optional('NODE_ENV', 'development'),
  PORT: Number(optional('PORT', '3000')),

  DATABASE_URL: optional('DATABASE_URL'),
  JWT_SECRET: optional('JWT_SECRET'),
  GROQ_API_KEY: optional('GROQ_API_KEY'),
  GROQ_MODEL: optional('GROQ_MODEL', 'llama3-8b-8192'),
  TELEGRAM_BOT_TOKEN: optional('TELEGRAM_BOT_TOKEN'),
  TELEGRAM_CHAT_ID: optional('TELEGRAM_CHAT_ID'),

  REMINDER_JOB_ENABLED: optional('REMINDER_JOB_ENABLED', 'true') === 'true',

  EVALUATION_CANDIDATE_NAME: optional('EVALUATION_CANDIDATE_NAME', 'Sahil Kumar'),
  EVALUATION_EMAIL: optional('EVALUATION_EMAIL', 'sahil.kumar01@adypu.edu.in'),
  EVALUATION_REPOSITORY_URL: optional(
    'EVALUATION_REPOSITORY_URL',
    'https://github.com/SAHILKUMARNEHRA/Hintro_Meeting-Intelligence-Service',
  ),
  EVALUATION_DEPLOYED_URL: optional('EVALUATION_DEPLOYED_URL', ''),

  required,
};

module.exports = { env };
