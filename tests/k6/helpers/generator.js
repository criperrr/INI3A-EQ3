/**
 * Presco k6 Test Suite - Realistic Data Generators
 */

const PRODUCT_NAMES = [
  'Arroz Branco Tipo 1 5kg',
  'Feijão Carioca Especial 1kg',
  'Óleo de Soja Refinado 900ml',
  'Açúcar Refinado 1kg',
  'Café Torrado e Moído Tradicional 500g',
  'Leite Integral UHT 1L',
  'Macarrão Espaguete com Ovos 500g',
  'Farinha de Trigo Tradicional 1kg',
  'Molho de Tomate Tradicional Sachê 300g',
  'Sabão em Pó Ação Total 1.6kg',
  'Detergente Líquido Maçã 500ml',
  'Água Sanitária Concentrada 2L',
  'Papel Higiênico Folha Dupla 12 Rolos',
  'Creme Dental Proteção Anticáries 90g',
  'Sabonete Hidratante em Barra 90g',
  'Refrigerante Cola Pet 2L',
  'Biscoito Recheado Chocolate 130g',
  'Iogurte Natural Integral 170g',
  'Manteiga com Sal Primeira Qualidade 200g',
  'Queijo Mussarela Fatiado 200g',
];

const BRANDS = [
  'Camil', 'Tio João', 'Liza', 'União', 'Pilão', 'Itambé', 'Barilla',
  'Dona Benta', 'Heinz', 'Omo', 'Ypê', 'Qboa', 'Neve', 'Colgate',
  'Dove', 'Coca-Cola', 'Oreo', 'Nestlé', 'Aviação', 'Sadia',
];

const CATEGORIES = [
  'Alimentos', 'Bebidas', 'Laticínios', 'Limpeza', 'Higiene',
  'Padaria', 'Hortifruti', 'Carnes', 'Congelados', 'Doces',
];

const BAURU_COORDINATES = [
  { name: 'Centro Bauru', lat: -22.3246, lng: -49.0714 },
  { name: 'Vila Aviação / Getúlio Vargas', lat: -22.3545, lng: -49.0493 },
  { name: 'Jardim América', lat: -22.3459, lng: -49.0595 },
  { name: 'Higienópolis', lat: -22.3382, lng: -49.0621 },
  { name: 'Geisel', lat: -22.3312, lng: -49.0345 },
  { name: 'Mary Dota', lat: -22.2981, lng: -49.0223 },
];

export function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFloat(min, max, decimals = 2) {
  const str = (Math.random() * (max - min) + min).toFixed(decimals);
  return parseFloat(str);
}

/**
 * Generate a valid 13-digit EAN barcode starting with 789 (Brazil prefix)
 */
export function generateValidEan13() {
  let ean = '789' + String(randomInt(100000000, 999999999));
  // Calculate EAN-13 checksum digit
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(ean.charAt(i), 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checksum = (10 - (sum % 10)) % 10;
  return ean.slice(0, 12) + String(checksum);
}

/**
 * Generates a realistic product payload for custom product registration
 */
export function generateProductPayload() {
  const baseName = randomItem(PRODUCT_NAMES);
  const brand = randomItem(BRANDS);
  const category = randomItem(CATEGORIES);
  const ean = generateValidEan13();
  const idSuffix = randomInt(100, 999);

  return {
    name: `${brand} ${baseName} #${idSuffix}`,
    category: category,
    categories: [category, 'Geral'],
    brand: brand,
    ean: ean,
    isPromotion: Math.random() > 0.7,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Generates a random realistic user registration payload
 */
export function generateUserPayload() {
  const timestamp = Date.now();
  const rand = randomInt(1000, 9999);
  return {
    name: `Tester k6 ${rand}`,
    email: `k6_user_${timestamp}_${rand}@prescotest.org`,
    password: `TestP@ss${rand}!`,
  };
}

/**
 * Generates coordinates centered in Bauru/SP with a random delta
 */
export function getRandomLocation() {
  const base = randomItem(BAURU_COORDINATES);
  const deltaLat = (Math.random() - 0.5) * 0.04;
  const deltaLng = (Math.random() - 0.5) * 0.04;
  return {
    latitude: parseFloat((base.lat + deltaLat).toFixed(6)),
    longitude: parseFloat((base.lng + deltaLng).toFixed(6)),
    areaName: base.name,
  };
}
