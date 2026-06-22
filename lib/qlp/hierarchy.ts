export type Tier = 'gerente' | 'subgerente' | 'coord' | 'supervisor' | 'base';

const NIVEL_HIERARQUICO: Record<Tier, number> = {
  gerente: 5,
  subgerente: 4,
  coord: 3,
  supervisor: 2,
  base: 1,
};

export function assertCanLead(tierLider: Tier | string, tierLiderado: Tier | string): void {
  const l = NIVEL_HIERARQUICO[tierLider as Tier];
  const a = NIVEL_HIERARQUICO[tierLiderado as Tier];
  if (!l || !a) {
    throw new Error(`tier inválido: ${tierLider}/${tierLiderado}`);
  }
  if (a >= l) {
    throw new Error(`tier "${tierLider}" não pode liderar tier "${tierLiderado}"`);
  }
  if (tierLider === 'supervisor' && tierLiderado !== 'base') {
    throw new Error('supervisor só pode liderar tier "base"');
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
