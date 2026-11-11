import test from "node:test";
import assert from "node:assert/strict";
import { computeGs1CheckDigit, validateGs1Barcode } from "../src/shared/util/barcodeValidator.ts";
import { productService } from "../src/modules/product/product.service.ts";
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
