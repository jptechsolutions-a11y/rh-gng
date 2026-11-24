import 'server-only';
import { and, asc, eq, inArray, or, sql } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import type { GestorOpt } from './tipos';

/**
 * Gestores regionais e nacionais do QLP: líderes ativos de nível "regional" ou "nacional",
 * ou com escopo nacional. Nacionais primeiro, depois por nome.
 */
const ehGestorRegionalOuNacional = or(
  inArray(schema.qlpLideres.nivel, ['regional', 'nacional']),
  eq(schema.qlpLideres.escopoNacional, true),
);

async function consultar(ids?: string[]): Promise<GestorOpt[]> {
  const linhas = await db
    .select({
      id: schema.qlpLideres.id,
      nome: schema.qlpColaboradores.nome,
      funcao: schema.qlpColaboradores.funcao,
      nivel: schema.qlpLideres.nivel,
      nacional: schema.qlpLideres.escopoNacional,
    })
    .from(schema.qlpLideres)
    .innerJoin(schema.qlpColaboradores, eq(schema.qlpColaboradores.id, schema.qlpLideres.colaboradorId))
    .where(
      and(
        eq(schema.qlpLideres.ativo, true),
        eq(schema.qlpColaboradores.ativo, true),
        ehGestorRegionalOuNacional,
        ids ? inArray(schema.qlpLideres.id, ids) : sql`true`,
      ),
    )
    .orderBy(asc(schema.qlpColaboradores.nome));
  return linhas
    .map((l) => ({
      id: l.id,
      nome: l.nome,
      funcao: l.funcao,
      escopo: (l.nacional || l.nivel === 'nacional' ? 'Nacional' : 'Regional') as GestorOpt['escopo'],
    }))
    .sort((a, b) => (a.escopo === b.escopo ? a.nome.localeCompare(b.nome, 'pt-BR') : a.escopo === 'Nacional' ? -1 : 1));
}

/** Lista para escolher quem decidiu. */
export const listarGestoresDecisao = () => consultar();

/** Só os ids que realmente são gestores regionais/nacionais (não confia no que veio da tela). */
export const gestoresPorIds = (ids: string[]) => (ids.length > 0 ? consultar(ids) : Promise.resolve([]));
