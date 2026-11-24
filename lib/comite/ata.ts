import 'server-only';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import type { Session } from '@/lib/auth/session';
import { participantesDoBanco, resumirDecisoes, type ResumoAta } from './ata-util';
import { buscarComite } from './buscar';
import type { ComiteLancamento } from './tipos';

export interface DadosAta {
  mes: string; // yyyy-mm
  meses: string[];
  /** yyyy-mm-dd; nulo enquanto não for informada */
  dataComite: string | null;
  participantes: string[];
  atualizadoPor: string | null;
  /** Todos os pedidos do mês, por filial e nome, cada um com o histórico de não aprovações anteriores. */
  lancamentos: ComiteLancamento[];
  resumo: ResumoAta;
}

/** Ata do comitê de um mês: pedidos (todas as filiais que a sessão enxerga), decisões e participantes salvos. */
export async function carregarAta(s: Session, mesParam?: string | null): Promise<DadosAta> {
  const d = await buscarComite(s, mesParam);
  const [ata] = await db
    .select()
    .from(schema.comiteAtas)
    .where(eq(schema.comiteAtas.mesReferencia, `${d.mes}-01`))
    .limit(1);
  const lancamentos = [...d.lancamentos].sort(
    (a, b) => a.filial.localeCompare(b.filial, 'pt-BR', { numeric: true }) || a.nome.localeCompare(b.nome, 'pt-BR'),
  );
  return {
    mes: d.mes,
    meses: d.meses,
    dataComite: ata?.dataComite ?? null,
    participantes: participantesDoBanco(ata?.participantes),
    atualizadoPor: ata?.atualizadoPor ?? null,
    lancamentos,
    resumo: resumirDecisoes(lancamentos.map((l) => l.decisao)),
  };
}

/** "2026-11-24" → "24/11/2026". */
export const dataBrDeIso = (iso: string | null): string => (iso ? iso.split('-').reverse().join('/') : '—');
