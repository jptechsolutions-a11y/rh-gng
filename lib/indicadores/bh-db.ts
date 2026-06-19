import { db, schema } from '@/db/client';
import { eq, inArray, sql } from 'drizzle-orm';
import type { SnapshotRow } from './bh-queries';

export async function fetchSnapshotRows(
  table: typeof schema.bhSnapshotAtual | typeof schema.bhSnapshotAnterior,
  filialIds?: string[] | null,
): Promise<SnapshotRow[]> {
  const q = db
    .select({
      filialId: table.filialId,
      filialNome: schema.filiais.nome,
      filialCodigo: schema.filiais.codigo,
      chapa: table.chapa,
      nome: table.nome,
      funcao: table.funcao,
      secao: table.secao,
      horasDecimal: sql<string>`${table.horasDecimal}`,
      valorPgto: sql<string>`${table.valorPgto}`,
    })
    .from(table)
    .leftJoin(schema.filiais, eq(table.filialId, schema.filiais.id));

  const rows = filialIds && filialIds.length > 0
    ? await q.where(inArray(table.filialId, filialIds))
    : !filialIds
      ? await q
      : []; // filialIds === [] → sem acesso a nenhuma filial

  return rows.map((r) => ({
    filialId: r.filialId,
    filialNome: r.filialNome,
    filialCodigo: r.filialCodigo,
    chapa: r.chapa,
    nome: r.nome,
    funcao: r.funcao,
    secao: r.secao,
    horasDecimal: Number(r.horasDecimal),
    valorPgto: Number(r.valorPgto),
  }));
}
