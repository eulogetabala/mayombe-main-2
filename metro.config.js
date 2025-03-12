const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Appliquer NativeWind à la configuration
const nativeWindConfig = withNativeWind(config, { input: './global.css' });

// Ajouter les options de transformation à la configuration NativeWind
nativeWindConfig.transformer = {
  ...nativeWindConfig.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

// Exporter la configuration complète
module.exports = nativeWindConfig;