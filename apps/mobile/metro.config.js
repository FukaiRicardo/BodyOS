const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const { mergeConfig } = require("@react-native/metro-config");

const config = getSentryExpoConfig(__dirname);

const blockList = [
  /node_modules[/\\]@opentelemetry[/\\].*/,
];

const customConfig = {
  resolver: {
    blacklistRE: blockList,
    blockList: blockList,
  },
};

module.exports = mergeConfig(config, customConfig);