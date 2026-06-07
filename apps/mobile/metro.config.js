const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName.includes('@opentelemetry') ||
    moduleName.includes('@vercel/otel') ||
    moduleName.includes('otel') ||
    moduleName === 'ws' ||
    moduleName === 'stream' ||
    moduleName === 'zlib' ||
    moduleName === 'net' ||
    moduleName === 'tls' ||
    moduleName === 'fs'
  ) {
    return { type: 'empty' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;