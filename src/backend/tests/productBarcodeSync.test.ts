import test from "node:test";
import assert from "node:assert/strict";
import { productService } from "../src/modules/product/product.service.ts";
import { ProductRepository } from "../src/shared/database/repositories/product.repository.ts";

test("ProductService - getProductByBarcode updates missing photo from OpenFoodFacts on scan", async () => {
  const testEan = "7891000100103";
  let updatedPayload: any = null;

  // Mock getProductByEan
  const origGetProductByEan = ProductRepository.getProductByEan;
  const origGetOFF = ProductRepository.getProductFromOpenFoodFacts;
  const origUpdate = ProductRepository.updateProduct;
  const origGetPrice = ProductRepository.getLatestPriceForProduct;
  const origGetStats = ProductRepository.getPriceStats;

  try {
    (ProductRepository as any).getProductByEan = async (ean: string) => {
      if (ean === testEan) {
        return {
          id: 42,
          ean: testEan,
          name: "Biscoito Teste",
          description: "Doces",
          icon: "", // previously empty!
          createdAt: new Date().toISOString(),
        };
      }
      return null;
    };

    (ProductRepository as any).getProductFromOpenFoodFacts = async (ean: string) => {
      if (ean === testEan) {
        return {
          code: testEan,
          status: 1,
          status_verbose: "product found",
          product: {
            product_name: "Biscoito Teste",
            image_front_url: "https://images.openfoodfacts.org/images/biscoito.jpg",
          },
        };
      }
      return null;
    };

    (ProductRepository as any).updateProduct = async (id: number, data: any) => {
      updatedPayload = { id, data };
      return {
        id,
        ean: testEan,
        name: "Biscoito Teste",
        description: "Doces",
        icon: data.icon,
        createdAt: new Date().toISOString(),
      };
    };

    (ProductRepository as any).getLatestPriceForProduct = async () => "R$ 4,50";
    (ProductRepository as any).getPriceStats = async () => ({
      minPrice: "R$ 4,50",
      maxPrice: "R$ 4,50",
      avgPrice: "R$ 4,50",
      count: 1,
    });

    const result = await productService.getProductByBarcode(testEan);

    assert.ok(result);
    assert.equal(result.id, 42);
    assert.equal(result.icon, "https://images.openfoodfacts.org/images/biscoito.jpg");
    assert.equal(result.imageUri, "https://images.openfoodfacts.org/images/biscoito.jpg");
    assert.ok(updatedPayload);
    assert.equal(updatedPayload.id, 42);
    assert.equal(updatedPayload.data.icon, "https://images.openfoodfacts.org/images/biscoito.jpg");
  } finally {
    (ProductRepository as any).getProductByEan = origGetProductByEan;
    (ProductRepository as any).getProductFromOpenFoodFacts = origGetOFF;
    (ProductRepository as any).updateProduct = origUpdate;
    (ProductRepository as any).getLatestPriceForProduct = origGetPrice;
    (ProductRepository as any).getPriceStats = origGetStats;
  }
});

test("ProductService - getProductByBarcode updates existing photo if OpenFoodFacts has a newer/different one", async () => {
  const testEan = "7891000200204";
  let updateCalled = false;

  const origGetProductByEan = ProductRepository.getProductByEan;
  const origGetOFF = ProductRepository.getProductFromOpenFoodFacts;
  const origUpdate = ProductRepository.updateProduct;
  const origGetPrice = ProductRepository.getLatestPriceForProduct;
  const origGetStats = ProductRepository.getPriceStats;

  try {
    (ProductRepository as any).getProductByEan = async () => ({
      id: 99,
      ean: testEan,
      name: "Chocolate",
      description: "Doces",
      icon: "https://images.openfoodfacts.org/images/old_chocolate.jpg",
      createdAt: new Date().toISOString(),
    });

    (ProductRepository as any).getProductFromOpenFoodFacts = async () => ({
      code: testEan,
      status: 1,
      status_verbose: "product found",
      product: {
        product_name: "Chocolate",
        image_front_url: "https://images.openfoodfacts.org/images/new_chocolate_v2.jpg",
      },
    });

    (ProductRepository as any).updateProduct = async (id: number, data: any) => {
      updateCalled = true;
      return {
        id,
        ean: testEan,
        name: "Chocolate",
        description: "Doces",
        icon: data.icon,
        createdAt: new Date().toISOString(),
      };
    };

    (ProductRepository as any).getLatestPriceForProduct = async () => null;
    (ProductRepository as any).getPriceStats = async () => ({ count: 0 });

    const result = await productService.getProductByBarcode(testEan);

    assert.ok(result);
    assert.ok(updateCalled);
    assert.equal(result.icon, "https://images.openfoodfacts.org/images/new_chocolate_v2.jpg");
  } finally {
    (ProductRepository as any).getProductByEan = origGetProductByEan;
    (ProductRepository as any).getProductFromOpenFoodFacts = origGetOFF;
    (ProductRepository as any).updateProduct = origUpdate;
    (ProductRepository as any).getLatestPriceForProduct = origGetPrice;
    (ProductRepository as any).getPriceStats = origGetStats;
  }
});
