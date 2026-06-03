const { getSentryExpoConfig } = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

const blockList = [
  /node_modules[/\\]@opentelemetry[/\\].*/,
];

config.resolver.blacklistRE = blockList;
config.resolver.blockList = blockList;

module.exports = config;