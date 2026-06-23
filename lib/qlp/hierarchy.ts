export type Tier = 'gerente' | 'subgerente' | 'coord' | 'supervisor' | 'encarregado' | 'base';
export type Nivel = 'nacional' | 'regional' | 'i' | 'ii' | null | undefined;

const NIVEL_HIERARQUICO: Record<Tier, number> = {
  gerente: 5,
  subgerente: 4,
  coord: 3,
  supervisor: 2,
  encarregado: 2,
  base: 1,
};

/**
 * Pode `lider` liderar `liderado`?
 *
 * Regras:
 * 1. Tier do líder estritamente acima → sempre OK
 *    (gerente lidera subg, coord, supervisor, base; coord lidera supervisor/base; etc.)
 * 2. Mesmo tier → só se o líder for **nacional** e o liderado **não for nacional**
 *    (ex.: gerente NACIONAL lidera gerente REGIONAL; coord NACIONAL lidera coord REGIONAL)
 * 3. Supervisor e Encarregado são casos especiais: lideram APENAS tier=base.
 * 4. Tier abaixo do líder → nunca.
 *
 * Aceita string genérica nos parâmetros para tolerar dados vindos do banco
 * com tipos imprecisos, e validar tudo aqui.
 */
export function assertCanLead(
  liderTier: Tier | string,
  lideradoTier: Tier | string,
  opts?: { liderNivel?: string | null; lideradoNivel?: string | null },
): void {
  const lt = liderTier as Tier;
  const at = lideradoTier as Tier;
  const l = NIVEL_HIERARQUICO[lt];
  const a = NIVEL_HIERARQUICO[at];
  if (!l || !a) {
    throw new Error(`tier inválido: ${liderTier}/${lideradoTier}`);
  }

  // Mesmo tier: válido somente se nacional → (regional/multi/filial) ou regional → (multi/filial)
  if (l === a) {
    const ln = opts?.liderNivel;
    const an = opts?.lideradoNivel;

    if (ln === 'nacional' && an !== 'nacional') {
      return;
    }
    if (ln === 'regional' && (an === 'multi' || an === 'filial' || !an)) {
      return;
    }

    throw new Error(
      `tier "${liderTier}" não pode liderar outro "${lideradoTier}" do mesmo nível ` +
        '(só nacional ou regional pode liderar níveis inferiores do mesmo tier)',
    );
  }

  if (a > l) {
    throw new Error(`tier "${liderTier}" não pode liderar tier "${lideradoTier}" (acima dele)`);
  }

  // Supervisor e Encarregado só lideram base
  if ((lt === 'supervisor' || lt === 'encarregado') && at !== 'base') {
    throw new Error(`${lt === 'supervisor' ? 'supervisor' : 'encarregado'} só pode liderar tier "base"`);
  }
}

export interface EscopoLider {
  escopoNacional: boolean;
  filiaisEscopo: string[];
}

export function escopoCobreFilial(lider: EscopoLider, filialId: string): boolean {
  if (lider.escopoNacional) return true;
  return lider.filiaisEscopo.includes(filialId);
}
