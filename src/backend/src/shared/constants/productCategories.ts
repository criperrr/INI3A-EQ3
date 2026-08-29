export interface PredefinedCategory {
  id: string;
  name: string;
  emoji: string;
  icon: string;
  description: string;
  aliases?: string[];
}

export const PREDEFINED_PRODUCT_CATEGORIES: PredefinedCategory[] = [
  {
    id: "alimentos_basicos",
    name: "Alimentos",
    emoji: "🌾",
    icon: "basket-outline",
    description: "Arroz, feijão, massas, óleos, açúcar, farinhas, grãos e condimentos essenciais.",
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
    description: "Sucos, refrigerantes, águas minerais, cafés, chás, isotônicos e energéticos.",
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
    description: "Pratos prontos congelados, pizzas, sorvetes, polpas e vegetais congelados.",
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
    description: "Sabão em pó, detergentes, amaciantes, desinfetantes, esponjas e alvejantes.",
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
    description: "Sabonetes, xampus, condicionadores, cremes dentais, desodorantes e cuidados pessoais.",
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
    description: "Fraldas descartáveis, lenços umedecidos, fórmulas infantis e higiene do bebê.",
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
    description: "Rações secas e úmidas, petiscos, areia sanitária e produtos para pets.",
    aliases: ["Pet Shop", "pets", "pet", "animais", "ração", "racao", "rações", "racoes", "gato", "cachorro"],
  },
  {
    id: "farmacia_saude",
    name: "Farmácia",
    emoji: "💊",
    icon: "medkit-outline",
    description: "Vitaminas, suplementos alimentares, curativos, álcool e primeiros socorros.",
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
    description: "Artigos de cozinha, potes, descartáveis, sacos de lixo e utilidades domésticas.",
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
    description: "Itens variados, sazonais e produtos gerais do cotidiano.",
    aliases: ["Outros / Geral", "Outros e Geral", "outros", "geral", "diversos", "others"],
  },
];

export const PREDEFINED_CATEGORY_NAMES = PREDEFINED_PRODUCT_CATEGORIES.map((c) => c.name);

export function findPredefinedCategory(search: string): PredefinedCategory | undefined {
  if (!search) return undefined;
  const clean = search.trim().toLowerCase();

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

export function normalizeCategoryName(input?: string | null): string {
  if (!input || !input.trim()) return "Outros";
  const matched = findPredefinedCategory(input);
  if (matched) return matched.name;
  return input.trim().slice(0, 100);
}
