const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add manual mapping for lodash if needed
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'lodash': path.resolve(__dirname, 'node_modules/lodash'),
};

// Configure server for Replit environment
config.server = {
  ...config.server,
  port: 5000,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return middleware(req, res, next);
    };
  },
};

module.exports = config;