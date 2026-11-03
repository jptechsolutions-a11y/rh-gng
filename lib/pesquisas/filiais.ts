import 'server-only';
import { count, eq } from 'drizzle-orm';
import { db, schema } from '@/db/client';

export interface FilialOpcao {
  codigo: string;
  nome: string;
  colaboradores: number;
}

/** Filiais com colaboradores ativos no QLP (é delas que sai o público das pesquisas). */
export async function filiaisDisponiveisPesquisa(): Promise<FilialOpcao[]> {
  const [qlp, filiais] = await Promise.all([
    db
      .select({ codfilial: schema.qlpColaboradores.codfilial, total: count() })
      .from(schema.qlpColaboradores)
      .where(eq(schema.qlpColaboradores.ativo, true))
      .groupBy(schema.qlpColaboradores.codfilial),
    db.select({ codigo: schema.filiais.codigo, nome: schema.filiais.nome }).from(schema.filiais),
  ]);
  const nome = new Map(filiais.map((f) => [f.codigo.replace(/^0+(?=\d)/, ''), f.nome]));
  return qlp
    .map((q) => ({ codigo: String(q.codfilial), nome: nome.get(String(q.codfilial)) ?? `Filial ${q.codfilial}`, colaboradores: q.total }))
    .sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }));
}
