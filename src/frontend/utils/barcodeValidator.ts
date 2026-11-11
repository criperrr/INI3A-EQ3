export type BarcodeFormat = "EAN-8" | "UPC-A" | "EAN-13" | "GTIN-14";

export interface BarcodeValidationResult {
  isValid: boolean;
  cleanCode: string;
  format: BarcodeFormat | null;
  expectedCheckDigit: number | null;
  actualCheckDigit: number | null;
  isBrazilianPrefix: boolean;
  reason?: string;
}

const VALID_LENGTHS: Record<number, BarcodeFormat> = {
  8: "EAN-8",
  12: "UPC-A",
  13: "EAN-13",
  14: "GTIN-14",
};

export function computeGs1CheckDigit(payloadDigits: string): number {
  let sum = 0;
  const len = payloadDigits.length;
  for (let i = 0; i < len; i++) {
    const digit = Number(payloadDigits[len - 1 - i]);
    const weight = i % 2 === 0 ? 3 : 1;
    sum += digit * weight;
  }
  return (10 - (sum % 10)) % 10;
}

export function validateGs1Barcode(raw: string | null | undefined): BarcodeValidationResult {
  const cleanCode = String(raw ?? "").replace(/\s+/g, "").trim();

  if (!cleanCode) {
    return {
      isValid: false,
      cleanCode: "",
      format: null,
      expectedCheckDigit: null,
      actualCheckDigit: null,
      isBrazilianPrefix: false,
      reason: "Código de barras vazio.",
    };
  }

  if (!/^\d+$/.test(cleanCode)) {
    return {
      isValid: false,
      cleanCode,
      format: null,
      expectedCheckDigit: null,
      actualCheckDigit: null,
      isBrazilianPrefix: false,
      reason: "O código de barras deve conter apenas números.",
    };
  }

  const format = VALID_LENGTHS[cleanCode.length] ?? null;
  if (!format) {
    return {
      isValid: false,
      cleanCode,
      format: null,
      expectedCheckDigit: null,
      actualCheckDigit: null,
      isBrazilianPrefix: false,
      reason: "Use 8 (EAN-8), 12 (UPC-A), 13 (EAN-13) ou 14 (GTIN-14) dígitos.",
    };
  }

  if (/^(\d)\1+$/.test(cleanCode)) {
    return {
      isValid: false,
      cleanCode,
      format,
      expectedCheckDigit: null,
      actualCheckDigit: null,
      isBrazilianPrefix: false,
      reason: "Sequência repetitiva inválida para código GS1.",
    };
  }

  const payload = cleanCode.slice(0, -1);
  const actualCheckDigit = Number(cleanCode[cleanCode.length - 1]);
  const expectedCheckDigit = computeGs1CheckDigit(payload);

  if (actualCheckDigit !== expectedCheckDigit) {
    return {
      isValid: false,
      cleanCode,
      format,
      expectedCheckDigit,
      actualCheckDigit,
      isBrazilianPrefix: cleanCode.startsWith("789") || cleanCode.startsWith("790"),
      reason: "Código de barras inválido pelo padrão GS1.",
    };
  }

  return {
    isValid: true,
    cleanCode,
    format,
    expectedCheckDigit,
    actualCheckDigit,
    isBrazilianPrefix: cleanCode.startsWith("789") || cleanCode.startsWith("790"),
  };
}
