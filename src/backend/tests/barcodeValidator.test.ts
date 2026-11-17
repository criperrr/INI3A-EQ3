import test from "node:test";
import assert from "node:assert/strict";
import { computeGs1CheckDigit, validateGs1Barcode } from "../src/shared/util/barcodeValidator.ts";
import { productService, PRODUCT_QUORUM_TARGET } from "../src/modules/product/product.service.ts";
import { ProductRepository } from "../src/shared/database/repositories/product.repository.ts";
import { UserRepository } from "../src/shared/database/repositories/user.repository.ts";
import { ValidationError } from "../src/shared/errors/errors.ts";

test("barcodeValidator - validates authentic Brazilian EAN-13 (7891000100103)", () => {
  const res = validateGs1Barcode("7891000100103");
  assert.equal(res.isValid, true);
  assert.equal(res.format, "EAN-13");
  assert.equal(res.isBrazilianPrefix, true);
  assert.equal(res.expectedCheckDigit, 3);
  assert.equal(res.actualCheckDigit, 3);
});

test("barcodeValidator - validates authentic EAN-8 (78912343)", () => {
  const check = computeGs1CheckDigit("7891234");
  const fullEan8 = `7891234${check}`;
  const res = validateGs1Barcode(fullEan8);
  assert.equal(res.isValid, true);
  assert.equal(res.format, "EAN-8");
  assert.equal(res.expectedCheckDigit, check);
});

test("barcodeValidator - rejects barcode with wrong Modulo-10 check digit", () => {
  const res = validateGs1Barcode("7891000100109");
  assert.equal(res.isValid, false);
  assert.equal(res.format, "EAN-13");
  assert.equal(res.expectedCheckDigit, 3);
  assert.equal(res.actualCheckDigit, 9);
  assert.ok(res.reason?.includes("inválido pelo padrão GS1"));
  assert.equal(res.reason?.includes("esperado"), false);
});

test("barcodeValidator - rejects repeated digit sequence (0000000000000)", () => {
  const res = validateGs1Barcode("0000000000000");
  assert.equal(res.isValid, false);
  assert.ok(res.reason?.includes("Sequência repetitiva"));
});

test("barcodeValidator - rejects invalid length or non-numeric barcode", () => {
  const shortRes = validateGs1Barcode("12345");
  assert.equal(shortRes.isValid, false);

  const alphaRes = validateGs1Barcode("789100010010A");
  assert.equal(alphaRes.isValid, false);
});

test("ProductService.createCustomProduct - throws ValidationError when optional EAN has invalid GS1 checksum", async () => {
  await assert.rejects(
    async () => {
      await productService.createCustomProduct(
        {
          name: "Produto Teste EAN Falso",
          ean: "1234567890123",
        },
        1,
      );
    },
    (err: any) => {
      assert.ok(err instanceof ValidationError);
      assert.equal(err.errors[0]?.field, "ean");
      return true;
    },
  );
});

test("ProductService.validateProductExistence - returns isGs1Valid=false for invalid Modulo-10 barcode", async () => {
  const res = await productService.validateProductExistence({ ean: "7891000100109" });
  assert.equal(res.exists, false);
  assert.equal(res.isGs1Valid, false);
  assert.equal(res.source, "none");
  assert.equal(res.matchedProduct, null);
});

test("ProductService.validateProductExistence - confirms real non-food Brazilian product via Waterfall Federation (7896098900208)", async () => {
  const origGetByEan = ProductRepository.getProductByEan;
  const origGetOFF = ProductRepository.getProductFromOpenFoodFacts;

  try {
    (ProductRepository as any).getProductByEan = async () => null;
    (ProductRepository as any).getProductFromOpenFoodFacts = async (ean: string) => ({
      code: ean,
      status: 1,
      source: "brazilian_retail_catalog",
      status_verbose: "product found in brazilian retail catalog",
      product: {
        product_name: "Papel Higiênico Folha Dupla Neve 12 Unidades",
        brands: "Neve",
        categories_tags: ["en:Limpeza"],
        image_front_url: "https://savegnago.vteximg.com.br/arquivos/ids/neve.jpg",
      },
    });

    const res = await productService.validateProductExistence({ ean: "7896098900208" });
    assert.equal(res.isGs1Valid, true);
    assert.equal(res.isBrazilianPrefix, true);
    assert.equal(res.exists, true);
    assert.ok(res.matchedProduct);
    assert.ok(res.matchedProduct.name.length > 3);
    assert.ok(
      ["brazilian_retail_catalog", "openfoodfacts", "cosmos_official_api", "local_database", "upcitemdb"].includes(
        res.source
      )
    );
  } finally {
    (ProductRepository as any).getProductByEan = origGetByEan;
    (ProductRepository as any).getProductFromOpenFoodFacts = origGetOFF;
  }
});

test("ProductService.validateProductExistence - detects prefix 2 variable-weight scale barcode (PLU)", async () => {
  const payload = "200123001590";
  const check = computeGs1CheckDigit(payload);
  const scaleEan = `${payload}${check}`;
  const res = await productService.validateProductExistence({ ean: scaleEan });
  assert.equal(res.exists, true);
  assert.equal(res.isGs1Valid, true);
  assert.equal(res.isVariableWeightCode, true);
  assert.equal(res.pluCode, "01230");
  assert.equal(res.source, "variable_weight_scale");
});

test("ProductService.validateProductExistence - places valid unindexed GS1 barcode in pending_review quarantine", async () => {
  const origGetByEan = ProductRepository.getProductByEan;
  const origGetOFF = ProductRepository.getProductFromOpenFoodFacts;

  try {
    (ProductRepository as any).getProductByEan = async () => null;
    (ProductRepository as any).getProductFromOpenFoodFacts = async () => null;

    const payload = "789999999999";
    const check = computeGs1CheckDigit(payload);
    const unindexedEan = `${payload}${check}`;
    const res = await productService.validateProductExistence({ ean: unindexedEan });
    assert.equal(res.isGs1Valid, true);
    assert.equal(res.canRegisterAsPending, true);
    assert.equal(res.source, "pending_review");
  } finally {
    (ProductRepository as any).getProductByEan = origGetByEan;
    (ProductRepository as any).getProductFromOpenFoodFacts = origGetOFF;
  }
});

test("ProductService.createCustomProduct - Quarantine & Multi-User Quorum (Anti-Sybil): same user does NOT release quarantine, 3 distinct users release it", async () => {
  const uniqueSuffix = String(Date.now()).slice(-7).padStart(7, "1");
  const payload = `78999${uniqueSuffix}`;
  const check = computeGs1CheckDigit(payload);
  const testEan = `${payload}${check}`;
  const testName = `Produto Quarentena Quórum ${uniqueSuffix}`;

  const origGetByEan = ProductRepository.getProductByEan;
  const origGetByName = ProductRepository.getProductByExactName;
  const origGetById = ProductRepository.getProductById;
  const origCreate = ProductRepository.createProduct;
  const origRecordSub = ProductRepository.recordProductSubmission;
  const origApprove = ProductRepository.approveProduct;
  const origSearch = ProductRepository.searchProducts;
  const origCount = ProductRepository.countProducts;
  const origGetPricesMap = ProductRepository.getLatestPricesForProductIds;
  const origGetPrice = ProductRepository.getLatestPriceForProduct;
  const origGetStats = ProductRepository.getPriceStats;
  const origGetOFF = ProductRepository.getProductFromOpenFoodFacts;
  const origIncPoints = UserRepository.incrementPoints;

  let storedProduct: any = null;
  const distinctSubmitters = new Set<number>();

  try {
    (ProductRepository as any).getProductFromOpenFoodFacts = async () => null;
    (ProductRepository as any).getLatestPriceForProduct = async () => "Preço não informado";
    (ProductRepository as any).getLatestPricesForProductIds = async () => new Map();
    (ProductRepository as any).getPriceStats = async () => ({
      minPrice: null,
      maxPrice: null,
      avgPrice: null,
      count: 0,
    });
    (UserRepository as any).incrementPoints = async () => {};

    (ProductRepository as any).getProductByEan = async (ean: string) => {
      if (storedProduct && storedProduct.ean === ean) return { ...storedProduct };
      return null;
    };

    (ProductRepository as any).getProductByExactName = async (name: string) => {
      if (storedProduct && storedProduct.name.toLowerCase() === name.trim().toLowerCase()) {
        return { ...storedProduct };
      }
      return null;
    };

    (ProductRepository as any).getProductById = async (id: number) => {
      if (storedProduct && storedProduct.id === id) return { ...storedProduct };
      return null;
    };

    (ProductRepository as any).createProduct = async (data: any) => {
      storedProduct = {
        id: 7001,
        ean: data.ean ?? null,
        ncm: null,
        name: data.name,
        description: data.description || data.categories?.[0] || "Geral",
        icon: data.icon ?? "",
        isSuspended: data.isSuspended ?? false,
        createdByUserId: data.createdByUserId ?? null,
        createdAt: new Date().toISOString(),
      };
      return { ...storedProduct };
    };

    (ProductRepository as any).recordProductSubmission = async (
      _productId: number,
      userId: number,
    ) => {
      const isNewSubmission = !distinctSubmitters.has(userId);
      distinctSubmitters.add(userId);
      const quorumUsersCount = distinctSubmitters.size;
      return {
        isNewSubmission,
        quorumUsersCount,
        contributorUserIds: Array.from(distinctSubmitters),
      };
    };

    (ProductRepository as any).approveProduct = async (productId: number) => {
      if (storedProduct && storedProduct.id === productId) {
        storedProduct.isSuspended = false;
        return { ...storedProduct };
      }
      return null;
    };

    (ProductRepository as any).searchProducts = async (filter: any) => {
      if (!storedProduct || storedProduct.isSuspended) return [];
      if (filter.search && !storedProduct.name.toLowerCase().includes(filter.search.toLowerCase())) {
        return [];
      }
      return [{ ...storedProduct }];
    };

    (ProductRepository as any).countProducts = async (filter: any) => {
      const list = await (ProductRepository as any).searchProducts(filter);
      return list.length;
    };

    // 1. User #1 submits unindexed product -> enters Quarantine (1/3)
    const sub1 = await productService.createCustomProduct(
      {
        name: testName,
        ean: testEan,
        category: "Mercearia",
        strictExistenceCheck: true,
      },
      1,
    );
    const createdProductId = sub1.id;
    assert.equal(sub1.isSuspended, true);
    assert.equal(sub1.pendingApproval, true);
    assert.equal(sub1.verificationStatus, "pending_review");
    assert.equal(sub1.quorumUsersCount, 1);
    assert.equal(sub1.quorumTarget, PRODUCT_QUORUM_TARGET);
    assert.equal(sub1.alreadySubmittedByUser, false);

    // Verify it is hidden from public search
    const publicSearchWhileQuarantined = await productService.listProducts({ search: testName });
    assert.equal(
      publicSearchWhileQuarantined.items.some((p) => p.id === createdProductId),
      false,
      "Quarantined product must NOT appear in public searches",
    );

    // 2. Same User (#1) submits the exact same product again -> Anti-Sybil: stays 1/3 and remains in Quarantine!
    const sub1Repeat = await productService.createCustomProduct(
      {
        name: testName,
        ean: testEan,
        category: "Mercearia",
        strictExistenceCheck: true,
      },
      1,
    );
    assert.equal(sub1Repeat.id, createdProductId);
    assert.equal(sub1Repeat.isSuspended, true);
    assert.equal(sub1Repeat.quorumUsersCount, 1);
    assert.equal(sub1Repeat.alreadySubmittedByUser, true);

    // 3. Second distinct user (#2) submits the same product -> reaches 2/3, still in Quarantine
    const sub2 = await productService.createCustomProduct(
      {
        name: testName,
        ean: testEan,
        category: "Mercearia",
        strictExistenceCheck: true,
      },
      2,
    );
    assert.equal(sub2.id, createdProductId);
    assert.equal(sub2.isSuspended, true);
    assert.equal(sub2.quorumUsersCount, 2);
    assert.equal(sub2.alreadySubmittedByUser, false);

    // 4. Third distinct user (#3) submits the same product -> reaches 3/3 Quorum! Automatically leaves Quarantine!
    const sub3 = await productService.createCustomProduct(
      {
        name: testName,
        ean: testEan,
        category: "Mercearia",
        strictExistenceCheck: true,
      },
      3,
    );
    assert.equal(sub3.id, createdProductId);
    assert.equal(sub3.isSuspended, false);
    assert.equal(sub3.pendingApproval, false);
    assert.equal(sub3.quorumUsersCount, 3);
    assert.equal(sub3.verificationStatus, "community_verified");

    // Verify it NOW appears in public search!
    const publicSearchAfterQuorum = await productService.listProducts({ search: testName });
    assert.equal(
      publicSearchAfterQuorum.items.some((p) => p.id === createdProductId),
      true,
      "Product approved by 3-user quorum MUST appear in public searches",
    );
  } finally {
    (ProductRepository as any).getProductByEan = origGetByEan;
    (ProductRepository as any).getProductByExactName = origGetByName;
    (ProductRepository as any).getProductById = origGetById;
    (ProductRepository as any).createProduct = origCreate;
    (ProductRepository as any).recordProductSubmission = origRecordSub;
    (ProductRepository as any).approveProduct = origApprove;
    (ProductRepository as any).searchProducts = origSearch;
    (ProductRepository as any).countProducts = origCount;
    (ProductRepository as any).getLatestPricesForProductIds = origGetPricesMap;
    (ProductRepository as any).getLatestPriceForProduct = origGetPrice;
    (ProductRepository as any).getPriceStats = origGetStats;
    (ProductRepository as any).getProductFromOpenFoodFacts = origGetOFF;
    (UserRepository as any).incrementPoints = origIncPoints;
  }
});

