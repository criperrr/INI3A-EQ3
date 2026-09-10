/**
 * app.config.js
 * Camada dinâmica sobre `app.json`.
 *
 * A chave do Google Maps NÃO pode viver no `app.json`: este repositório é
 * público, e o arquivo é versionado. Ela entra aqui a partir do ambiente
 * (`src/frontend/.env`, que é gitignored) e é injetada no AndroidManifest
 * durante o prebuild.
 *
 * Importante: a chave acaba embutida no APK de qualquer forma — isso é
 * inerente ao Google Maps no Android. A proteção correta não é escondê-la do
 * APK, e sim restringi-la no Google Cloud Console por nome de pacote
 * (com.presco.app) + impressão SHA-1 do certificado de assinatura.
 */
module.exports = ({ config }) => {
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
    android: {
      ...config.android,
      ...(googleMapsApiKey
        ? { config: { ...config.android?.config, googleMaps: { apiKey: googleMapsApiKey } } }
        : {}),
    },
  };
};
