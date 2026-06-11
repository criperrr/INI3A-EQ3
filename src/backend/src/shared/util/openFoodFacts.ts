export interface OffProductData {
  ean: string;
  name: string;
  description?: string;
  icon?: string;
}

/**
 * Fetches product metadata from the Open Food Facts API by barcode (EAN).
 * Returns normalized product information or null if not found.
 */
export async function fetchFromOpenFoodFacts(ean: string): Promise<OffProductData | null> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${ean}.json`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "PrescoApp/1.0 (contact@presco.com) - Node fetch API",
      },
    });

    if (!response.ok) {
      return null;
    }

    const body = await response.json();
    if (body.status !== 1 || !body.product) {
      return null;
    }

    const product = body.product;

    // Open Food Facts offers multiple localized names/descriptions, try Portuguese first, then English, then fallback
    const name =
      product.product_name_pt ||
      product.product_name ||
      product.product_name_en ||
      product.generic_name_pt ||
      product.generic_name ||
      "Produto Sem Nome";

    const description =
      product.generic_name_pt ||
      product.generic_name ||
      product.generic_name_en ||
      product.description ||
      "";

    const icon =
      product.image_url ||
      product.image_front_url ||
      product.image_small_url ||
      null;

    return {
      ean,
      name,
      description,
      icon: icon || undefined,
    };
  } catch (error) {
    console.error(`[OpenFoodFacts] Error fetching barcode ${ean}:`, error);
    return null;
  }
}
