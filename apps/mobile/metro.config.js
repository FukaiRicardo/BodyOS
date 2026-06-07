const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Bloqueia módulos Node.js incompatíveis com React Native
  if (
    moduleName.includes('@opentelemetry') ||
    moduleName.includes('@vercel/otel') ||
    moduleName.includes('otel') ||
    moduleName === 'ws' ||
    moduleName === 'zlib' ||
    moduleName === 'stream' ||
    moduleName === 'net' ||
    moduleName === 'tls' ||
    moduleName === 'fs' ||
    moduleName === 'crypto'
  ) {
    return { type: 'empty' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;