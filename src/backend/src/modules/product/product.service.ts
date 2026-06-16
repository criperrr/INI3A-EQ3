import * as repository from "./product.repository";
import { fetchFromOpenFoodFacts } from "@/shared/util/openFoodFacts";
import { NotFound } from "@/shared/errors/errors";

/**
 * Searches the catalog for products by name (fuzzy) or exact EAN,
 * returning best local prices and market coordinates.
 */
export async function searchProducts(
  query: string,
  lat?: number,
  lng?: number,
  radius?: number,
) {
  return repository.searchProducts(query, lat, lng, radius);
}

/**
 * Retrieves a product by its EAN barcode.
 * If not in the local database, queries Open Food Facts API and persists it.
 */
export async function getProductByBarcode(ean: string) {
  // 1. Search locally
  const localProduct = await repository.getProductByEan(ean);
  if (localProduct) {
    return localProduct;
  }

  // 2. Query Open Food Facts API
  const offProduct = await fetchFromOpenFoodFacts(ean);
  if (!offProduct) {
    throw new NotFound(`Product with barcode ${ean} not found in local catalog or Open Food Facts.`);
  }

  // 3. Persist product in local DB
  const newProduct = await repository.createProduct({
    name: offProduct.name,
    ean: offProduct.ean,
    description: offProduct.description,
    icon: offProduct.icon,
  });

  return newProduct;
}

/**
 * Retrieves product details along with a list of local price offers.
 */
export async function getProductDetails(id: number, lat?: number, lng?: number) {
  const product = await repository.getProductById(id);
  if (!product) {
    throw new NotFound(`Product with ID ${id} not found.`);
  }

  const offers = await repository.getProductOffers(id, lat, lng);

  return {
    ...product,
    offers,
  };
}

/**
 * Manually registers a new product in the global catalog.
 */
export async function createProduct(payload: {
  name: string;
  ean?: string;
  ncm?: string;
  description?: string;
  icon?: string;
  tags?: string;
}) {
  return repository.createProduct(payload);
}
