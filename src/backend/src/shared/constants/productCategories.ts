export interface PredefinedCategory {
  id: string;
  name: string;
  emoji: string;
  icon: string;
  description: string;
}

export const PREDEFINED_PRODUCT_CATEGORIES: PredefinedCategory[] = [
  {
    id: "alimentos_basicos",
    name: "Alimentos Básicos",
    emoji: "🌾",
    icon: "basket-outline",
    description: "Arroz, feijão, massas, óleos, açúcar, farinhas, grãos e condimentos essenciais.",
  },
  {
    id: "hortifruti",
    name: "Hortifrúti",
    emoji: "🥦",
    icon: "leaf-outline",
    description: "Frutas frescas, legumes, verduras, ervas e produtos da horta.",
  },
  {
    id: "carnes_aves_peixes",
    name: "Carnes, Aves & Peixes",
    emoji: "🥩",
    icon: "restaurant-outline",
    description: "Cortes bovinos, suínos, aves, pescados, frutos do mar e embutidos frescos.",
  },
  {
    id: "laticinios_ovos",
    name: "Laticínios & Ovos",
    emoji: "🥛",
    icon: "water-outline",
    description: "Leites, queijos, iogurtes, manteigas, requeijão, cremes e ovos.",
  },
  {
    id: "padaria_confeitaria",
    name: "Padaria & Confeitaria",
    emoji: "🥖",
    icon: "pizza-outline",
    description: "Pães artesanais, bolos, tortas, torradas, biscoitos e massas frescas.",
  },
  {
    id: "bebidas",
    name: "Bebidas",
    emoji: "🧃",
    icon: "cafe-outline",
    description: "Sucos, refrigerantes, águas minerais, cafés, chás, isotônicos e energéticos.",
  },
  {
    id: "congelados",
    name: "Congelados & Resfriados",
    emoji: "🧊",
    icon: "snow-outline",
    description: "Pratos prontos congelados, pizzas, sorvetes, polpas e vegetais congelados.",
  },
  {
    id: "doces_snacks",
    name: "Doces & Snacks",
    emoji: "🍪",
    icon: "happy-outline",
    description: "Chocolates, salgadinhos, petiscos, balas, guloseimas e sobremesas.",
  },
  {
    id: "limpeza",
    name: "Limpeza & Lavanderia",
    emoji: "🧹",
    icon: "sparkles-outline",
    description: "Sabão em pó, detergentes, amaciantes, desinfetantes, esponjas e alvejantes.",
  },
  {
    id: "higiene_beleza",
    name: "Higiene Pessoal & Beleza",
    emoji: "🧴",
    icon: "heart-outline",
    description: "Sabonetes, xampus, condicionadores, cremes dentais, desodorantes e cuidados pessoais.",
  },
  {
    id: "bebes_infantil",
    name: "Bebês & Infantil",
    emoji: "👶",
    icon: "body-outline",
    description: "Fraldas descartáveis, lenços umedecidos, fórmulas infantis e higiene do bebê.",
  },
  {
    id: "pet_shop",
    name: "Pet Shop",
    emoji: "🐾",
    icon: "paw-outline",
    description: "Rações secas e úmidas, petiscos, areia sanitária e produtos para pets.",
  },
  {
    id: "farmacia_saude",
    name: "Farmácia & Saúde",
    emoji: "💊",
    icon: "medkit-outline",
    description: "Vitaminas, suplementos alimentares, curativos, álcool e primeiros socorros.",
  },
  {
    id: "utilidades_bazar",
    name: "Utilidades & Bazar",
    emoji: "🏠",
    icon: "home-outline",
    description: "Artigos de cozinha, potes, descartáveis, sacos de lixo e utilidades domésticas.",
  },
  {
    id: "outros",
    name: "Outros / Geral",
    emoji: "📦",
    icon: "grid-outline",
    description: "Itens variados, sazonais e produtos gerais do cotidiano.",
  },
];

export const PREDEFINED_CATEGORY_NAMES = PREDEFINED_PRODUCT_CATEGORIES.map((c) => c.name);

export function findPredefinedCategory(search: string): PredefinedCategory | undefined {
  if (!search) return undefined;
  const clean = search.trim().toLowerCase();
  return PREDEFINED_PRODUCT_CATEGORIES.find(
    (c) =>
      c.id.toLowerCase() === clean ||
      c.name.toLowerCase() === clean ||
      clean.includes(c.name.toLowerCase()) ||
      c.name.toLowerCase().includes(clean)
  );
}

export function normalizeCategoryName(input?: string | null): string {
  if (!input || !input.trim()) return "Outros / Geral";
  const matched = findPredefinedCategory(input);
  if (matched) return matched.name;
  return input.trim().slice(0, 100);
}
