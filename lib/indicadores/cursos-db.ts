import { db, schema } from '@/db/client';
import { eq, sql } from 'drizzle-orm';
import type { CursosSnapshotRow } from './cursos-queries';

export async function fetchCursosRows(
  table: typeof schema.cursosSnapshotAtual | typeof schema.cursosSnapshotAnterior,
  filialId?: string,
): Promise<CursosSnapshotRow[]> {
  const q = db
    .select({
      filialId: table.filialId,
      filialNome: schema.filiais.nome,
      filialCodigo: schema.filiais.codigo,
      codfilialOrigem: table.codfilialOrigem,
      chapa: table.chapa,
      nome: table.nome,
      funcao: table.funcao,
      secao: table.secao,
      regional: table.regional,
      bandeira: table.bandeira,
      codsituacao: table.codsituacao,
      tipo: table.tipo,
      dataTreinamento: sql<string | null>`to_char(${table.dataTreinamento}, 'YYYY-MM-DD')`,
      pendencia: table.pendencia,
    })
    .from(table)
    .leftJoin(schema.filiais, eq(table.filialId, schema.filiais.id));

  const rows = filialId ? await q.where(eq(table.filialId, filialId)) : await q;
  return rows as CursosSnapshotRow[];
}
