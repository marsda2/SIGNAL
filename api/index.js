// Vercel entry point: serves the Expo Router API routes (src/app/api/**) from the `expo export -p web` server bundle.
const path = require('path');
const { createRequestHandler } = require('expo-server/adapter/vercel');

module.exports = createRequestHandler({
  build: path.join(__dirname, '../dist/server'),
});
