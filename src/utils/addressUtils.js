/**
 * Utilitário de endereçamento para normalização de estados.
 */

const BRAZILIAN_STATES_MAP = {
    'ACRE': 'AC',
    'ALAGOAS': 'AL',
    'AMAPA': 'AP',
    'AMAZONAS': 'AM',
    'BAHIA': 'BA',
    'CEARA': 'CE',
    'DISTRITO FEDERAL': 'DF',
    'ESPIRITO SANTO': 'ES',
    'GOIAS': 'GO',
    'MARANHAO': 'MA',
    'MATO GROSSO': 'MT',
    'MATO GROSSO DO SUL': 'MS',
    'MINAS GERAIS': 'MG',
    'PARA': 'PA',
    'PARAIBA': 'PB',
    'PARANA': 'PR',
    'PERNAMBUCO': 'PE',
    'PIAUI': 'PI',
    'RIO DE JANEIRO': 'RJ',
    'RIO GRANDE DO NORTE': 'RN',
    'RIO GRANDE DO SUL': 'RS',
    'RONDONIA': 'RO',
    'RORAIMA': 'RR',
    'SANTA CATARINA': 'SC',
    'SAO PAULO': 'SP',
    'SERGIPE': 'SE',
    'TOCANTINS': 'TO'
};

/**
 * Normaliza o nome do estado.
 * Se for um estado brasileiro por extenso ou com acentos, retorna a sigla correta de 2 letras.
 * Se for um estado internacional ou já estiver em formato de sigla, retorna o texto em maiúsculas limpo.
 * 
 * @param {string} stateName - Nome ou sigla do estado a ser normalizado
 * @returns {string} Estado normalizado
 */
export const normalizeState = (stateName) => {
    if (!stateName) return '';
    
    const trimmed = stateName.trim();
    // Remove acentos e caracteres especiais para comparação robusta
    const normalized = trimmed
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    // Se bater com alguma chave de estado brasileiro, retorna a sigla
    if (BRAZILIAN_STATES_MAP[normalized]) {
        return BRAZILIAN_STATES_MAP[normalized];
    }

    // Retorna em maiúsculas (para manter o padrão do banco e aceitar internacional)
    return trimmed.toUpperCase();
};
