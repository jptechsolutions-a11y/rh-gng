import { db, schema } from '@/db/client';
import { eq, sql } from 'drizzle-orm';
import type { FeriadosRowDb } from './feriados-queries';

export async function fetchFeriadosRows(filialId?: string): Promise<FeriadosRowDb[]> {
  const t = schema.feriadosSnapshot;
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
      codsecao: t.codsecao,
      regional: t.regional,
      bandeira: t.bandeira,
      pendencia: t.pendencia,
      dataFeriado: sql<string | null>`to_char(${t.dataFeriado}, 'YYYY-MM-DD')`,
      valor: sql<string>`${t.valor}`,
      dsr: sql<string>`${t.dsr}`,
      encargos: sql<string>`${t.encargos}`,
      total: sql<string>`${t.total}`,
    })
    .from(t)
    .leftJoin(schema.filiais, eq(t.filialId, schema.filiais.id));

  const rows = filialId ? await q.where(eq(t.filialId, filialId)) : await q;
  return rows.map((r) => ({
    ...r,
    valor: Number(r.valor),
    dsr: Number(r.dsr),
    encargos: Number(r.encargos),
    total: Number(r.total),
  }));
}
