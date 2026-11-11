/**
 * imageUtils.ts
 * Utilitários para normalização e otimização de imagens no Presco.
 * Reduz a resolução de fotos e o uso de memória RAM de decodificação sem perda visual em telas móveis.
 */

const KNOWN_BROKEN_URL_FRAGMENTS = [
  "images.openfoodfacts.org/images/placeholder.png",
  "photo-1585670270608-b4b4f1da0d01",
  "photo-1559567123-956247c45831",
];

const LOCAL_HTTP_HOST_REGEX =
  /^http:\/\/(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?(\/|$)/i;

const OFF_SELECTED_IMAGE_FULL_REGEX =
  /\/(front|ingredients|nutrition|packaging)(_[a-z]{2})?\.\d+\.full\.jpg$/i;

/**
 * Retorna uma URL otimizada para dispositivos móveis com largura alvo e formato moderno.
 *
 * @param url URL da imagem original
 * @param targetWidth Largura máxima desejada para a exibição na tela (padrão: 280px)
 * @param quality Qualidade da imagem (1-100, padrão: 70)
 */
export function getOptimizedImageUrl(
  url?: string | null,
  targetWidth = 280,
  quality = 70
): string | undefined {
  if (!url || typeof url !== "string") {
    return undefined;
  }

  const cleanUrl = url.trim();
  if (
    !cleanUrl ||
    cleanUrl.toLowerCase() === "null" ||
    cleanUrl.toLowerCase() === "undefined"
  ) {
    return undefined;
  }

  if (KNOWN_BROKEN_URL_FRAGMENTS.some((frag) => cleanUrl.includes(frag))) {
    return undefined;
  }

  const normalizedUrl =
    /^http:\/\//i.test(cleanUrl) && !LOCAL_HTTP_HOST_REGEX.test(cleanUrl)
      ? cleanUrl.replace(/^http:\/\//i, "https://")
      : cleanUrl;

  // 1. Otimização direta para Unsplash
  if (normalizedUrl.includes("images.unsplash.com")) {
    try {
      const parsed = new URL(normalizedUrl);
      parsed.searchParams.set("w", String(targetWidth));
      parsed.searchParams.set("q", String(quality));
      parsed.searchParams.set("auto", "format");
      if (!parsed.searchParams.has("fit")) {
        parsed.searchParams.set("fit", "crop");
      }
      return parsed.toString();
    } catch {
      // Fallback para substituição regex se URL parsing falhar
      return normalizedUrl
        .replace(/([?&])w=\d+/, `$1w=${targetWidth}`)
        .replace(/([?&])q=\d+/, `$1q=${quality}`);
    }
  }

  // 2. OpenFoodFacts: só converte .full.jpg -> .400.jpg se seguir o padrão de corte oficial
  // (uploads brutos como /1.full.jpg não possuem variante .400.jpg e retornariam 404)
  if (
    normalizedUrl.includes("images.openfoodfacts.org") &&
    OFF_SELECTED_IMAGE_FULL_REGEX.test(normalizedUrl)
  ) {
    return normalizedUrl.replace(/\.full\.jpg$/i, ".400.jpg");
  }

  return normalizedUrl;
}
