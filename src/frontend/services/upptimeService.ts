/**
 * Service to fetch and parse Open Food Facts Upptime monitor data
 * Source: https://github.com/openfoodfacts/openfoodfacts-upptime
 */

export interface UpptimeServiceItem {
  name: string;
  url: string;
  icon?: string;
  slug: string;
  status: "up" | "down" | string;
  uptime: string;
  uptimeDay?: string;
  uptimeWeek?: string;
  uptimeMonth?: string;
  uptimeYear?: string;
  time?: number;
  timeDay?: number;
  timeWeek?: number;
  timeMonth?: number;
  timeYear?: number;
  dailyMinutesDown?: Record<string, number>;
  // Presco metadata
  isPrescoEssential?: boolean;
  prescoUsageType?: "ean" | "images" | "search" | "main";
  prescoRoleDescription?: string;
}

export interface UpptimeSummaryResult {
  overallStatus: "all_up" | "has_issues" | "error";
  essentialServices: UpptimeServiceItem[];
  allServices: UpptimeServiceItem[];
  upCount: number;
  downCount: number;
  totalCount: number;
  lastChecked: Date;
  fromCache?: boolean;
}

const UPPTIME_SUMMARY_URL =
  "https://raw.githubusercontent.com/openfoodfacts/openfoodfacts-upptime/master/history/summary.json";

// In-memory cache
let cachedResult: UpptimeSummaryResult | null = null;
let lastFetchTimestamp = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

/**
 * Identifies whether a service is critical for Presco features
 */
function classifyPrescoService(item: any): {
  isPrescoEssential: boolean;
  prescoUsageType?: "ean" | "images" | "search" | "main";
  prescoRoleDescription?: string;
} {
  const slug = item.slug || "";
  const name = (item.name || "").toLowerCase();

  // EAN and barcode lookup
  if (slug === "api-v2" || slug === "api-v3") {
    return {
      isPrescoEssential: true,
      prescoUsageType: "ean",
      prescoRoleDescription: "Consulta e catálogo de produtos por código de barras (EAN)",
    };
  }

  // CDN Images
  if (slug === "open-food-facts-images" || name.includes("images")) {
    return {
      isPrescoEssential: true,
      prescoUsageType: "images",
      prescoRoleDescription: "Servidor de fotos e embalagens exibidas nos produtos",
    };
  }

  // Search API
  if (slug === "search-api-v2" || slug === "search") {
    return {
      isPrescoEssential: true,
      prescoUsageType: "search",
      prescoRoleDescription: "Mecanismo de busca textual e sugestão de alimentos",
    };
  }

  // Main portal
  if (slug === "main-website-open-food-facts") {
    return {
      isPrescoEssential: true,
      prescoUsageType: "main",
      prescoRoleDescription: "Servidor principal e base de dados global do Open Food Facts",
    };
  }

  return { isPrescoEssential: false };
}

/**
 * Fetches status summary from Open Food Facts Upptime repository
 */
export async function fetchOpenFoodFactsStatus(
  forceRefresh = false
): Promise<UpptimeSummaryResult> {
  const now = Date.now();

  if (!forceRefresh && cachedResult && now - lastFetchTimestamp < CACHE_TTL_MS) {
    return { ...cachedResult, fromCache: true };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(UPPTIME_SUMMARY_URL, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Falha HTTP ${response.status} ao obter dados do Upptime.`);
    }

    const rawList = await response.json();

    if (!Array.isArray(rawList)) {
      throw new Error("Formato de resposta inválido do Upptime.");
    }

    let upCount = 0;
    let downCount = 0;

    const allServices: UpptimeServiceItem[] = rawList.map((item: any) => {
      const isUp = item.status === "up";
      if (isUp) {
        upCount++;
      } else {
        downCount++;
      }

      const classification = classifyPrescoService(item);

      return {
        name: item.name || "Serviço Desconhecido",
        url: item.url || "",
        icon: item.icon,
        slug: item.slug || "",
        status: item.status || "unknown",
        uptime: item.uptime || "0%",
        uptimeDay: item.uptimeDay,
        uptimeWeek: item.uptimeWeek,
        uptimeMonth: item.uptimeMonth,
        uptimeYear: item.uptimeYear,
        time: item.time,
        timeDay: item.timeDay,
        timeWeek: item.timeWeek,
        timeMonth: item.timeMonth,
        timeYear: item.timeYear,
        dailyMinutesDown: item.dailyMinutesDown,
        isPrescoEssential: classification.isPrescoEssential,
        prescoUsageType: classification.prescoUsageType,
        prescoRoleDescription: classification.prescoRoleDescription,
      };
    });

    // Sort essentials to the top, ordered: ean -> images -> search -> main
    const orderPriority: Record<string, number> = {
      ean: 1,
      images: 2,
      search: 3,
      main: 4,
    };

    const essentialServices = allServices
      .filter((s) => s.isPrescoEssential)
      .sort((a, b) => {
        const orderA = orderPriority[a.prescoUsageType || ""] || 99;
        const orderB = orderPriority[b.prescoUsageType || ""] || 99;
        return orderA - orderB;
      });

    // Check if any essential service has issues
    const anyEssentialDown = essentialServices.some((s) => s.status !== "up");
    const overallStatus: "all_up" | "has_issues" =
      anyEssentialDown || downCount > 0 ? "has_issues" : "all_up";

    const result: UpptimeSummaryResult = {
      overallStatus,
      essentialServices,
      allServices,
      upCount,
      downCount,
      totalCount: allServices.length,
      lastChecked: new Date(),
      fromCache: false,
    };

    cachedResult = result;
    lastFetchTimestamp = now;

    return result;
  } catch (error: any) {
    clearTimeout(timeoutId);

    // If cache is present, return it with a warning
    if (cachedResult) {
      return {
        ...cachedResult,
        fromCache: true,
      };
    }

    throw new Error(
      error?.name === "AbortError"
        ? "Tempo limite excedido ao consultar o Upptime do Open Food Facts."
        : error?.message || "Não foi possível conectar aos servidores do Upptime."
    );
  }
}
