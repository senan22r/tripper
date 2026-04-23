require('dotenv').config();

module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...(config.extra || {}),
    STORMGLASS_API_KEY: process.env.STORMGLASS_API_KEY || '',
    DEMO_API_DELAY_MS: process.env.DEMO_API_DELAY_MS || '',
  },
});

