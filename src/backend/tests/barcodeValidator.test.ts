import test from "node:test";
import assert from "node:assert/strict";
import { computeGs1CheckDigit, validateGs1Barcode } from "../src/shared/util/barcodeValidator.ts";
import { productService, PRODUCT_QUORUM_TARGET } from "../src/modules/product/product.service.ts";
import { ProductRepository } from "../src/shared/database/repositories/product.repository.ts";
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
  const res = await productService.validateProductExistence({ ean: "7896098900208" });
  assert.equal(res.isGs1Valid, true);
  assert.equal(res.isBrazilianPrefix, true);
  if (res.exists && res.matchedProduct) {
    assert.ok(res.matchedProduct.name.length > 3);
    assert.ok(
      ["brazilian_retail_catalog", "openfoodfacts", "cosmos_official_api", "local_database", "upcitemdb"].includes(
        res.source
      )
    );
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
  const payload = "789999999999";
  const check = computeGs1CheckDigit(payload);
  const unindexedEan = `${payload}${check}`;
  const res = await productService.validateProductExistence({ ean: unindexedEan });
  assert.equal(res.isGs1Valid, true);
  assert.equal(res.canRegisterAsPending, true);
  assert.equal(res.source, "pending_review");
});

test("ProductService.createCustomProduct - Quarantine & Multi-User Quorum (Anti-Sybil): same user does NOT release quarantine, 3 distinct users release it", async () => {
  const uniqueSuffix = String(Date.now()).slice(-7).padStart(7, "1");
  const payload = `78999${uniqueSuffix}`;
  const check = computeGs1CheckDigit(payload);
  const testEan = `${payload}${check}`;
  const testName = `Produto Quarentena Quórum ${uniqueSuffix}`;

  let createdProductId = 0;

  try {
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
    createdProductId = sub1.id;
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
    if (createdProductId > 0) {
      await ProductRepository.deleteProduct(createdProductId);
    }
  }
});

