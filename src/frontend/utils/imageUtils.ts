/**
 * imageUtils.ts
 * Utilitários para normalização e otimização de imagens no Presco.
 * Reduz a resolução de fotos e o uso de memória RAM de decodificação sem perda visual em telas móveis.
 */

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
  if (!cleanUrl) return undefined;

  // 1. Otimização direta para Unsplash
  if (cleanUrl.includes("images.unsplash.com")) {
    try {
      const parsed = new URL(cleanUrl);
      parsed.searchParams.set("w", String(targetWidth));
      parsed.searchParams.set("q", String(quality));
      parsed.searchParams.set("auto", "format");
      if (!parsed.searchParams.has("fit")) {
        parsed.searchParams.set("fit", "crop");
      }
      return parsed.toString();
    } catch {
      // Fallback para substituição regex se URL parsing falhar
      return cleanUrl
        .replace(/([?&])w=\d+/, `$1w=${targetWidth}`)
        .replace(/([?&])q=\d+/, `$1q=${quality}`);
    }
  }

  // 2. OpenFoodFacts: se for URL de imagem .full.jpg (12MP de upload cru), tenta trocar para .400.jpg
  if (cleanUrl.includes("images.openfoodfacts.org") && cleanUrl.includes(".full.jpg")) {
    return cleanUrl.replace(".full.jpg", ".400.jpg");
  }

  return cleanUrl;
}
