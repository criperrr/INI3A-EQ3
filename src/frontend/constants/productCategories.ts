import type { TranslationSchema } from "../i18n/types";

export interface ProductCategoryItem {
  id: string;
  name: string;
  emoji: string;
  icon: keyof typeof import("@expo/vector-icons")["Ionicons"]["glyphMap"] | string;
  i18nKey: keyof TranslationSchema["productCategories"];
  description: string;
}


export const PREDEFINED_PRODUCT_CATEGORIES: ProductCategoryItem[] = [
  {
    id: "alimentos_basicos",
    name: "Alimentos Básicos",
    emoji: "🌾",
    icon: "basket-outline",
    i18nKey: "alimentos_basicos",
    description: "Arroz, feijão, massas, óleos, açúcar, farinhas e condimentos essenciais.",
  },
  {
    id: "hortifruti",
    name: "Hortifrúti",
    emoji: "🥦",
    icon: "leaf-outline",
    i18nKey: "hortifruti",
    description: "Frutas frescas, legumes, verduras, ervas e produtos da horta.",
  },
  {
    id: "carnes_aves_peixes",
    name: "Carnes, Aves & Peixes",
    emoji: "🥩",
    icon: "restaurant-outline",
    i18nKey: "carnes_aves_peixes",
    description: "Cortes bovinos, suínos, aves, pescados, frutos do mar e embutidos frescos.",
  },
  {
    id: "laticinios_ovos",
    name: "Laticínios & Ovos",
    emoji: "🥛",
    icon: "water-outline",
    i18nKey: "laticinios_ovos",
    description: "Leites, queijos, iogurtes, manteigas, requeijão, cremes e ovos.",
  },
  {
    id: "padaria_confeitaria",
    name: "Padaria & Confeitaria",
    emoji: "🥖",
    icon: "pizza-outline",
    i18nKey: "padaria_confeitaria",
    description: "Pães artesanais, bolos, tortas, torradas, biscoitos e massas frescas.",
  },
  {
    id: "bebidas",
    name: "Bebidas",
    emoji: "🧃",
    icon: "cafe-outline",
    i18nKey: "bebidas",
    description: "Sucos, refrigerantes, águas minerais, cafés, chás e energéticos.",
  },
  {
    id: "congelados",
    name: "Congelados & Resfriados",
    emoji: "🧊",
    icon: "snow-outline",
    i18nKey: "congelados",
    description: "Pratos prontos congelados, pizzas, sorvetes, polpas e vegetais.",
  },
  {
    id: "doces_snacks",
    name: "Doces & Snacks",
    emoji: "🍪",
    icon: "happy-outline",
    i18nKey: "doces_snacks",
    description: "Chocolates, salgadinhos, petiscos, balas, guloseimas e sobremesas.",
  },
  {
    id: "limpeza",
    name: "Limpeza & Lavanderia",
    emoji: "🧹",
    icon: "sparkles-outline",
    i18nKey: "limpeza",
    description: "Sabão em pó, detergentes, amaciantes, desinfetantes e alvejantes.",
  },
  {
    id: "higiene_beleza",
    name: "Higiene Pessoal & Beleza",
    emoji: "🧴",
    icon: "heart-outline",
    i18nKey: "higiene_beleza",
    description: "Sabonetes, xampus, condicionadores, cremes dentais e cuidados pessoais.",
  },
  {
    id: "bebes_infantil",
    name: "Bebês & Infantil",
    emoji: "👶",
    icon: "body-outline",
    i18nKey: "bebes_infantil",
    description: "Fraldas descartáveis, lenços umedecidos e cuidados infantis.",
  },
  {
    id: "pet_shop",
    name: "Pet Shop",
    emoji: "🐾",
    icon: "paw-outline",
    i18nKey: "pet_shop",
    description: "Rações, petiscos e produtos de cuidado para animais de estimação.",
  },
  {
    id: "farmacia_saude",
    name: "Farmácia & Saúde",
    emoji: "💊",
    icon: "medkit-outline",
    i18nKey: "farmacia_saude",
    description: "Vitaminas, suplementos, curativos e itens de primeiros socorros.",
  },
  {
    id: "utilidades_bazar",
    name: "Utilidades & Bazar",
    emoji: "🏠",
    icon: "home-outline",
    i18nKey: "utilidades_bazar",
    description: "Artigos de cozinha, potes, descartáveis e utilidades domésticas.",
  },
  {
    id: "outros",
    name: "Outros / Geral",
    emoji: "📦",
    icon: "grid-outline",
    i18nKey: "outros",
    description: "Itens variados, sazonais e produtos gerais do cotidiano.",
  },
];

export function findCategoryDefinition(categoryNameOrSlug?: string | null): ProductCategoryItem | undefined {
  if (!categoryNameOrSlug) return undefined;
  const clean = categoryNameOrSlug.trim().toLowerCase();
  return PREDEFINED_PRODUCT_CATEGORIES.find(
    (c) =>
      c.id.toLowerCase() === clean ||
      c.name.toLowerCase() === clean ||
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
    return t("productCategories.outros") || "Outros / Geral";
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
