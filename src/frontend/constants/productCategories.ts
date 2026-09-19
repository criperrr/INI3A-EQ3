import type { TranslationSchema } from "../i18n/types";

export interface ProductCategoryItem {
  id: string;
  name: string;
  emoji: string;
  icon: keyof typeof import("@expo/vector-icons")["Ionicons"]["glyphMap"] | string;
  i18nKey: keyof TranslationSchema["productCategories"];
  description: string;
  aliases?: string[];
}

export const PREDEFINED_PRODUCT_CATEGORIES: ProductCategoryItem[] = [
  {
    id: "alimentos_basicos",
    name: "Alimentos",
    emoji: "🌾",
    icon: "basket-outline",
    i18nKey: "alimentos_basicos",
    description: "Arroz, feijão, massas, óleos, açúcar, farinhas e condimentos essenciais.",
    aliases: [
      "Alimentos Básicos",
      "Alimentos Basicos",
      "mercearia",
      "alimentos",
      "pantry",
      "básicos",
      "basicos",
      "arroz",
      "feijão",
      "feijao",
      "açúcar",
      "acucar",
      "óleo",
      "oleo",
      "azeite",
      "farinha",
      "massas",
      "macarrão",
      "macarrao",
      "grãos",
      "graos",
    ],
  },
  {
    id: "hortifruti",
    name: "Hortifrúti",
    emoji: "🥦",
    icon: "leaf-outline",
    i18nKey: "hortifruti",
    description: "Frutas frescas, legumes, verduras, ervas e produtos da horta.",
    aliases: [
      "hortifruti",
      "hortifrúti",
      "frutas",
      "verduras",
      "legumes",
      "vegetais",
      "fruta",
      "legume",
      "verdura",
      "hortaliças",
      "produce",
    ],
  },
  {
    id: "carnes_aves_peixes",
    name: "Carnes",
    emoji: "🥩",
    icon: "restaurant-outline",
    i18nKey: "carnes_aves_peixes",
    description: "Cortes bovinos, suínos, aves, pescados, frutos do mar e embutidos frescos.",
    aliases: [
      "Carnes, Aves & Peixes",
      "Carnes, Aves e Peixes",
      "carnes",
      "açougue",
      "acougue",
      "aves",
      "peixes",
      "frango",
      "bovino",
      "suíno",
      "suino",
      "pescado",
      "peixe",
      "carne",
      "embutidos",
      "meat",
    ],
  },
  {
    id: "laticinios_ovos",
    name: "Laticínios",
    emoji: "🥛",
    icon: "water-outline",
    i18nKey: "laticinios_ovos",
    description: "Leites, queijos, iogurtes, manteigas, requeijão, cremes e ovos.",
    aliases: [
      "Laticínios & Ovos",
      "Laticínios e Ovos",
      "laticinios",
      "laticínios",
      "ovos",
      "leite",
      "queijo",
      "iogurte",
      "manteiga",
      "requeijão",
      "requeijao",
      "dairy",
    ],
  },
  {
    id: "padaria_confeitaria",
    name: "Padaria",
    emoji: "🥖",
    icon: "pizza-outline",
    i18nKey: "padaria_confeitaria",
    description: "Pães artesanais, bolos, tortas, torradas, biscoitos e massas frescas.",
    aliases: [
      "Padaria & Confeitaria",
      "Padaria e Confeitaria",
      "padaria",
      "pães",
      "pao",
      "pão",
      "bolos",
      "confeitaria",
      "biscoito",
      "torrada",
      "bakery",
    ],
  },
  {
    id: "bebidas",
    name: "Bebidas",
    emoji: "🧃",
    icon: "cafe-outline",
    i18nKey: "bebidas",
    description: "Sucos, refrigerantes, águas minerais, cafés, chás e energéticos.",
    aliases: [
      "bebidas",
      "drinks",
      "sucos",
      "refrigerantes",
      "beverages",
      "refrigerante",
      "cerveja",
      "vinho",
      "água",
      "agua",
      "cafe",
      "café",
      "chá",
      "cha",
      "suco",
    ],
  },
  {
    id: "congelados",
    name: "Congelados",
    emoji: "🧊",
    icon: "snow-outline",
    i18nKey: "congelados",
    description: "Pratos prontos congelados, pizzas, sorvetes, polpas e vegetais.",
    aliases: [
      "Congelados & Resfriados",
      "Congelados e Resfriados",
      "congelados",
      "resfriados",
      "congelado",
      "sorvete",
      "pizza",
      "frozen",
    ],
  },
  {
    id: "doces_snacks",
    name: "Doces & Snacks",
    emoji: "🍪",
    icon: "happy-outline",
    i18nKey: "doces_snacks",
    description: "Chocolates, salgadinhos, petiscos, balas, guloseimas e sobremesas.",
    aliases: [
      "doces",
      "snacks",
      "doces e snacks",
      "doces & snacks",
      "guloseimas",
      "sobremesas",
      "chocolates",
      "chocolate",
      "salgadinho",
      "bala",
      "biscoitos",
      "sweets",
    ],
  },
  {
    id: "limpeza",
    name: "Limpeza",
    emoji: "🧹",
    icon: "sparkles-outline",
    i18nKey: "limpeza",
    description: "Sabão em pó, detergentes, amaciantes, desinfetantes e alvejantes.",
    aliases: [
      "Limpeza & Lavanderia",
      "Limpeza e Lavanderia",
      "limpeza",
      "lavanderia",
      "cleaning",
      "detergente",
      "detergentes",
      "sabão",
      "sabao",
      "desinfetante",
      "alvejante",
      "amaciante",
      "líquido",
      "liquido",
      "limpador",
    ],
  },
  {
    id: "higiene_beleza",
    name: "Higiene",
    emoji: "🧴",
    icon: "heart-outline",
    i18nKey: "higiene_beleza",
    description: "Sabonetes, xampus, condicionadores, cremes dentais e cuidados pessoais.",
    aliases: [
      "Higiene Pessoal & Beleza",
      "Higiene Pessoal e Beleza",
      "higiene",
      "beleza",
      "cosméticos",
      "cosmeticos",
      "cuidados pessoais",
      "sabonete",
      "xampu",
      "shampoo",
      "creme dental",
      "desodorante",
      "hygiene",
    ],
  },
  {
    id: "bebes_infantil",
    name: "Bebês",
    emoji: "👶",
    icon: "body-outline",
    i18nKey: "bebes_infantil",
    description: "Fraldas descartáveis, lenços umedecidos e cuidados infantis.",
    aliases: [
      "Bebês & Infantil",
      "Bebês e Infantil",
      "Bebes e Infantil",
      "bebês",
      "bebes",
      "infantil",
      "crianças",
      "criancas",
      "fralda",
      "fraldas",
      "baby",
    ],
  },
  {
    id: "pet_shop",
    name: "Pets",
    emoji: "🐾",
    icon: "paw-outline",
    i18nKey: "pet_shop",
    description: "Rações, petiscos e produtos de cuidado para animais de estimação.",
    aliases: ["Pet Shop", "pets", "pet", "animais", "ração", "racao", "rações", "racoes", "gato", "cachorro"],
  },
  {
    id: "farmacia_saude",
    name: "Farmácia",
    emoji: "💊",
    icon: "medkit-outline",
    i18nKey: "farmacia_saude",
    description: "Vitaminas, suplementos, curativos e itens de primeiros socorros.",
    aliases: [
      "Farmácia & Saúde",
      "Farmácia e Saúde",
      "Farmacia e Saude",
      "farmácia",
      "farmacia",
      "saúde",
      "saude",
      "pharmacy",
      "medicamentos",
      "remédio",
      "remedio",
      "vitamina",
    ],
  },
  {
    id: "utilidades_bazar",
    name: "Utilidades",
    emoji: "🏠",
    icon: "home-outline",
    i18nKey: "utilidades_bazar",
    description: "Artigos de cozinha, potes, descartáveis e utilidades domésticas.",
    aliases: [
      "Utilidades & Bazar",
      "Utilidades e Bazar",
      "utilidades",
      "bazar",
      "casa",
      "utensílios",
      "utensilios",
      "descartáveis",
      "descartaveis",
      "household",
    ],
  },
  {
    id: "outros",
    name: "Outros",
    emoji: "📦",
    icon: "grid-outline",
    i18nKey: "outros",
    description: "Itens variados, sazonais e produtos gerais do cotidiano.",
    aliases: ["Outros / Geral", "Outros e Geral", "outros", "geral", "diversos", "others"],
  },
];

export function findCategoryDefinition(categoryNameOrSlug?: string | null): ProductCategoryItem | undefined {
  if (!categoryNameOrSlug) return undefined;
  const clean = categoryNameOrSlug.trim().toLowerCase();

  // 1. Direct match on ID or Name
  const exact = PREDEFINED_PRODUCT_CATEGORIES.find(
    (c) => c.id.toLowerCase() === clean || c.name.toLowerCase() === clean
  );
  if (exact) return exact;

  // 2. Exact match in aliases
  const aliasExact = PREDEFINED_PRODUCT_CATEGORIES.find((c) =>
    c.aliases?.some((a) => a.toLowerCase() === clean)
  );
  if (aliasExact) return aliasExact;

  // 3. Substring match in aliases
  const aliasSub = PREDEFINED_PRODUCT_CATEGORIES.find((c) =>
    c.aliases?.some(
      (a) =>
        a.length >= 3 &&
        (clean.includes(a.toLowerCase()) || a.toLowerCase().includes(clean))
    )
  );
  if (aliasSub) return aliasSub;

  // 4. Substring match on category name
  return PREDEFINED_PRODUCT_CATEGORIES.find(
    (c) =>
      clean.includes(c.name.toLowerCase()) ||
      c.name.toLowerCase().includes(clean)
  );
}

export function getCategoryEmoji(categoryNameOrSlug?: string | null): string {
  const cat = findCategoryDefinition(categoryNameOrSlug);
  return cat ? cat.emoji : "📦";
}

export function getCategoryIcon(categoryNameOrSlug?: string | null): string {
  const cat = findCategoryDefinition(categoryNameOrSlug);
  return cat ? cat.icon : "grid-outline";
}

export function getLocalizedCategoryName(
  categoryNameOrSlug: string | null | undefined,
  t: (key: any) => string
): string {
  if (!categoryNameOrSlug || !categoryNameOrSlug.trim()) {
    return t("productCategories.outros") || "Outros";
  }
  const clean = categoryNameOrSlug.trim();
  const cat = findCategoryDefinition(clean);
  if (cat) {
    const translated = t(`productCategories.${cat.i18nKey}`);
    if (translated && !translated.startsWith("productCategories.")) {
      return translated;
    }
    return cat.name;
  }
  return clean;
}
