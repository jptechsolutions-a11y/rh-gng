import 'server-only';
import type { db as dbType } from '@/db/client';
import { qlpHistorico } from '@/db/schema';

export { assertCanLead, escopoCobreFilial } from '@/lib/qlp/hierarchy';
export type { Tier, EscopoLider } from '@/lib/qlp/hierarchy';

export interface AtorContexto {
  tipo: 'admin' | 'filial' | 'sync';
  id: string | null;
  nome: string;
  filialContextoId: string | null;
}

type DbOrTx = typeof dbType;

export async function gravarHistorico(
  tx: DbOrTx,
  params: {
    evento: string;
    colaboradorId?: string | null;
    liderIdAntigo?: string | null;
    liderIdNovo?: string | null;
    detalhes: Record<string, unknown>;
    ator: AtorContexto;
  },
): Promise<void> {
  await tx.insert(qlpHistorico).values({
    evento: params.evento,
    colaboradorId: params.colaboradorId ?? null,
    liderIdAntigo: params.liderIdAntigo ?? null,
    liderIdNovo: params.liderIdNovo ?? null,
    detalhes: params.detalhes,
    atorTipo: params.ator.tipo,
    atorId: params.ator.id,
    atorNome: params.ator.nome,
    filialContextoId: params.ator.filialContextoId,
  });
}
