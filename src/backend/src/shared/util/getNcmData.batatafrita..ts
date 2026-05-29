// FUNCTIONS EXTRACTED FROM https://github.com/BrasilAPI/BrasilAPI/blob/87af0ff69effdeb3417a7320440ba6e5db69a3de/pages/api/ncm/v1/index.js
// ALL CREDITS TO BRASILAPI. THANK YOU

/**
 * Interface para dados brutos retornados pela API SEFAZ
 */
interface RawNcmData {
    TIPO_ATO_INI: string;
    NUMERO_ATO_INI: string;
    ANO_ATO_INI: string;
    DATA_INICIO: string;
    DATA_FIM: string;
    [key: string]: string;
}

/**
 * Interface para dados processados de NCM (Nomenclatura Comum do MERCOSUL)
 */
export interface ProcessedNcmData {
    [key: string]: string | number | boolean;
    data_inicio: string;
    data_fim: string;
    tipo_ato: string;
    numero_ato: string;
    ano_ato: string;
    codigo: string;
    descricao: string;
}

/**
 * Interface para resposta da API SEFAZ
 */
interface SefazApiResponse {
    Nomenclaturas: RawNcmData[];
}

/**
 * Interface para opções de busca
 */
interface SearchOptions {
    term: string;
    searchInDescription?: boolean;
    searchInCode?: boolean;
}

/**
 * Converte data no formato DD/MM/YYYY para ISO (YYYY-MM-DD)
 * @param date - String de data no formato DD/MM/YYYY
 * @returns Data formatada em YYYY-MM-DD
 */
const formatDate = (date: string): string => {
    const newDate = new Date(date.split("/").reverse().join("/"));
    return newDate.toISOString().slice(0, 10);
};

/**
 * Normaliza chaves de objeto para lowercase
 * @param obj - Objeto com chaves em qualquer casing
 * @returns Objeto com chaves em lowercase
 */
const convertKeysToLowerCase = (
    obj: Record<string, string>,
): Record<string, string> => {
    return Object.fromEntries(
        Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v]),
    );
};

/**
 * Processa dados brutos da API para formato padronizado
 * @param obj - Objeto bruto da API SEFAZ
 * @returns Dados processados e normalizados
 */
const parseObject = (obj: RawNcmData): ProcessedNcmData => {
    const normalized = convertKeysToLowerCase(obj);

    const {
        tipo_ato_ini: tipoAtoIni,
        numero_ato_ini: numeroAtoIni,
        ano_ato_ini: anoAtoIni,
        data_inicio: dataInicio,
        data_fim: dataFim,
        ...rest
    } = normalized;

    return {
        ...rest,
        data_inicio: formatDate(dataInicio),
        data_fim: formatDate(dataFim),
        tipo_ato: tipoAtoIni,
        numero_ato: numeroAtoIni,
        ano_ato: anoAtoIni,
    } as ProcessedNcmData;
};

/**
 * Busca dados de nomenclatura na API SEFAZ
 * @returns Array de dados NCM processados
 * @throws Error se houver falha na requisição
 */
const fetchNcmListFromSefaz = async (): Promise<ProcessedNcmData[]> => {
    const url =
        "https://portalunico.siscomex.gov.br/classif/api/publico/nomenclatura/download/json";

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Erro na requisição SEFAZ: ${response.statusText}`);
        }
        const body: SefazApiResponse = await response.json();
        return body.Nomenclaturas.map(parseObject);
    } catch (error) {
        throw new Error(
            `Falha ao buscar dados NCM: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        );
    }
};

/**
 * Busca por descrição no NCM
 * @param description - Descrição do NCM
 * @param searchTerm - Termo de busca
 * @returns Verdadeiro se encontrado
 */
const searchByDescription = (
    description: string,
    searchTerm: string,
): boolean => {
    return String(description).toLowerCase().includes(searchTerm.toLowerCase());
};

/**
 * Busca por código NCM
 * @param code - Código NCM
 * @param searchTerm - Termo de busca (números apenas)
 * @returns Verdadeiro se encontrado
 */
const searchByCode = (code: string, searchTerm: string): boolean => {
    return code.replace(/\D/g, "").startsWith(searchTerm.replace(/[,.]/, ""));
};

/**
 * Obtém lista completa de dados NCM da API SEFAZ
 * @returns Array de dados NCM processados
 */
export const getNcmData = async (): Promise<ProcessedNcmData[]> => {
    return await fetchNcmListFromSefaz();
};

/**
 * Busca dados NCM com filtro opcional
 * @param searchTerm - Termo de busca (opcional)
 * @param options - Opções de busca
 * @returns Array de NCMs filtrados e tempo de execução
 */
export const searchNcmData = async (
    searchTerm?: string,
    options?: Partial<SearchOptions>,
): Promise<{
    data: ProcessedNcmData[];
    executionTimeMs: number;
}> => {
    const startTime = Date.now();

    try {
        let ncmData = await getNcmData();

        if (searchTerm && searchTerm.trim()) {
            const searchInDescription = options?.searchInDescription !== false;
            const searchInCode = options?.searchInCode !== false;

            ncmData = ncmData.filter((ncm) => {
                let matches = false;

                if (searchInDescription && ncm.descricao) {
                    matches =
                        matches ||
                        searchByDescription(String(ncm.descricao), searchTerm);
                }

                if (searchInCode && ncm.codigo) {
                    matches =
                        matches || searchByCode(String(ncm.codigo), searchTerm);
                }

                return matches;
            });
        }

        const executionTimeMs = Date.now() - startTime;

        return {
            data: ncmData,
            executionTimeMs,
        };
    } catch (error) {
        throw new Error(
            `Erro ao buscar dados NCM: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        );
    }
};

/**
 * Exporta as funções de busca para uso em outros módulos
 */
export const ncmUtils = {
    searchByDescription,
    searchByCode,
};
