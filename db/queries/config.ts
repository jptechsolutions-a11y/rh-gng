import 'server-only';
import { cache } from 'react';
import { and, asc, eq, or } from 'drizzle-orm';
import { db, schema } from '../client';

export const getCargosAtivos = cache(async () =>
  db.select({ nome: schema.cargos.nome })
    .from(schema.cargos)
    .where(eq(schema.cargos.ativo, true))
    .orderBy(asc(schema.cargos.nome))
);

export const getRoteiro = cache(async (cargo: string) => {
  return db.select().from(schema.roteiro)
    .where(and(eq(schema.roteiro.ativo, true), or(eq(schema.roteiro.cargo, 'TODOS'), eq(schema.roteiro.cargo, cargo))))
    .orderBy(asc(schema.roteiro.ordem));
});

export const getOpcoes = cache(async () => {
  const rows = await db.select().from(schema.opcoes);
  const out: Record<string, string[]> = {};
  for (const r of rows) out[r.chave] = r.valores;
  return out;
});

export const getFiliaisAtivas = cache(async () =>
  db.select({
    id: schema.filiais.id,
    codigo: schema.filiais.codigo,
    nome: schema.filiais.nome,
  })
    .from(schema.filiais)
    .where(eq(schema.filiais.ativa, true))
    .orderBy(asc(schema.filiais.codigo))
);
