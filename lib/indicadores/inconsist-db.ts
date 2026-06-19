import { db, schema } from '@/db/client';
import { eq, inArray, sql } from 'drizzle-orm';
import type { InconsistRowDb } from './inconsist-queries';

export async function fetchInconsistRows(filialIds?: string[] | null): Promise<InconsistRowDb[]> {
  const t = schema.inconsistSnapshot;
  const q = db
    .select({
      filialId: t.filialId,
      filialNome: schema.filiais.nome,
      filialCodigo: schema.filiais.codigo,
      codfilialOrigem: t.codfilialOrigem,
      chapa: t.chapa,
      nome: t.nome,
      funcao: t.funcao,
      secao: t.secao,
      regional: t.regional,
      bandeira: t.bandeira,
      tipo: t.tipo,
      dataOcorrencia: sql<string | null>`to_char(${t.dataOcorrencia}, 'YYYY-MM-DD')`,
    })
    .from(t)
    .leftJoin(schema.filiais, eq(t.filialId, schema.filiais.id));

  const rows = filialIds && filialIds.length > 0
    ? await q.where(inArray(t.filialId, filialIds))
    : !filialIds
      ? await q
      : [];
  return rows as InconsistRowDb[];
}
