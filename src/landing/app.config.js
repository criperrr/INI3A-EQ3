module.exports = ({ config }) => {
  const rawBaseUrl = process.env.EXPO_BASE_URL || process.env.BASE_URL || "";
  // Ensure leading slash if non-empty, remove trailing slash
  let baseUrl = rawBaseUrl.trim();
  if (baseUrl && !baseUrl.startsWith("/")) {
    baseUrl = `/${baseUrl}`;
  }
  if (baseUrl.length > 1 && baseUrl.endsWith("/")) {
    baseUrl = baseUrl.slice(0, -1);
  }

  return {
    ...config,
    name: "Presco - Economia Inteligente nos Supermercados",
    slug: "landing-page",
    platforms: ["web"],
    web: {
      bundler: "metro",
      output: "single",
    },
    experiments: {
      ...(baseUrl ? { baseUrl } : {}),
    },
  };
};
