export type Tier = 'gerente' | 'subgerente' | 'coord' | 'supervisor' | 'base';
export type Nivel = 'nacional' | 'regional' | 'i' | 'ii' | null;
export type Trilha =
  | 'logistica'
  | 'transporte'
  | 'abastecimento'
  | 'prevencao'
  | 'gg'
  | 'manutencao'
  | 'ti'
  | 'financ'
  | 'outros';

export interface Classificacao {
  tier: Tier;
  nivel: Nivel;
  trilha: Trilha;
}

const TIER_RULES: Array<[RegExp, Tier, Nivel]> = [
  [/^GERENTE NAC(\.|IONAL)/i, 'gerente', 'nacional'],
  [/^GERENTE REGIONAL/i, 'gerente', 'regional'],
  [/^GERENTE /i, 'gerente', 'regional'],
  [/^SUBGERENTE/i, 'subgerente', null],
  [/^COORD(\.|ENADOR) NACIONAL/i, 'coord', 'nacional'],
  [/^COORD(\.|ENADOR) REGIONAL/i, 'coord', 'regional'],
  [/^COORD(\.|ENADOR)/i, 'coord', 'regional'],
  [/^SUPERVISOR.*\bII\b/i, 'supervisor', 'ii'],
  [/^SUPERVISOR/i, 'supervisor', 'i'],
  [/^ENC(\.|ARREGADO)/i, 'supervisor', 'i'],
];

const TRILHA_RULES: Array<[RegExp, Trilha]> = [
  [/LOGISTICA|WMS|ARMAZEM|DEPOSITO|EMPILHA|CONFERENTE|MOVIMENTACAO/i, 'logistica'],
  [/TRANSPORTE|MOTORISTA|CARRETEIRO|ROTEIRIZACAO/i, 'transporte'],
  [/ABASTECIMENTO/i, 'abastecimento'],
  [/PREVENCAO|MONITORAMENTO|VIGILANTE|PORTEIRO/i, 'prevencao'],
  [/GENTE E GESTAO|G&G|\bRH\b/i, 'gg'],
  [/MANUTENCAO|ELETRO|JARDIN|HIGIEN|LIMPEZA|ZELADOR|COZINH|NUTRI/i, 'manutencao'],
  [/\bTI\b|SUPORTE|AUTOMACAO/i, 'ti'],
  [/FINANC/i, 'financ'],
];

export function autoclassify(funcao: string): Classificacao {
  const f = funcao.trim();
  let tier: Tier = 'base';
  let nivel: Nivel = null;
  for (const [re, t, n] of TIER_RULES) {
    if (re.test(f)) {
      tier = t;
      nivel = n;
      break;
    }
  }
  let trilha: Trilha = 'outros';
  for (const [re, tr] of TRILHA_RULES) {
    if (re.test(f)) {
      trilha = tr;
      break;
    }
  }
  return { tier, nivel, trilha };
}
