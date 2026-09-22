/**
 * app.config.js
 * Configuração dinâmica do Expo com suporte a Flavors/Variants (Dev/Staging vs Produção).
 *
 * Suporta segregação estrita entre:
 * - development / staging: package com.presco.app.dev, nome "Presco (Dev)", scheme presco-dev
 * - production: package com.presco.app, nome "Presco", scheme presco
 */
module.exports = ({ config }) => {
  const appVariant = process.env.APP_VARIANT || "production";
  const isDev = appVariant === "development" || appVariant === "staging";

  const appName = isDev ? "Presco (Dev)" : (config.name || "Presco");
  const appId = isDev ? "com.presco.app.dev" : (config.android?.package || "com.presco.app");
  const scheme = isDev ? "presco-dev" : (config.scheme || "presco");

  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();

  if (!googleMapsApiKey) {
    console.warn(
      "[app.config] GOOGLE_MAPS_API_KEY ausente: no Android o " +
        "react-native-maps DERRUBA o app ao abrir o mapa (IllegalStateException em MapView.onCreate). " +
        "Defina-a em src/frontend/.env e rode 'npm run android' novamente.",
    );
  }

  return {
    ...config,
    name: appName,
    scheme: scheme,
    ios: {
      ...config.ios,
      bundleIdentifier: appId,
    },
    android: {
      ...config.android,
      package: appId,
      ...(googleMapsApiKey
        ? { config: { ...config.android?.config, googleMaps: { apiKey: googleMapsApiKey } } }
        : {}),
    },
    extra: {
      ...config.extra,
      appVariant,
      isDev,
    },
  };
};
