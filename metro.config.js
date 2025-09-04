// Metro configuration with early polyfills
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('metro-config').ConfigT} */
module.exports = (async () => {
  const config = await getDefaultConfig(__dirname);

  // Ensure URL/URLSearchParams polyfills load before any app code (including expo-router)
  config.serializer = config.serializer || {};
  const runBefore = config.serializer.getModulesRunBeforeMainModule || (() => []);
  config.serializer.getModulesRunBeforeMainModule = () => [
    require.resolve('react-native-url-polyfill/auto'),
    ...runBefore(),
  ];

  return config;
})();

