const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Garante que o Metro consiga ler a extensão .mjs da biblioteca de ícones
config.resolver.sourceExts.push('mjs');

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;