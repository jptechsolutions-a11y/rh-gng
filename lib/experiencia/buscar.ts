import 'server-only';
import { desc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db, schema } from '@/db/client';
import type { Session } from '@/lib/auth/session';
import { getFiliaisCodigosVisiveis } from '@/lib/auth/session';
import { normalizarCodigoFilial } from '@/lib/vagas/normalizar-codigo-filial';
import { classificar, SEM_GESTOR, statusPendente, type ExpPendencia, type ExpResumoImport } from './tipos';

/** Hoje (yyyy-mm-dd) no fuso de Brasília — o alerta de 5 dias conta a partir daqui, não da data da extração. */
export function hojeBrasilia(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

/** chapa → nome do líder direto cadastrado no QLP. */
async function liderPorChapa(): Promise<Map<string, string>> {
  const liderColab = alias(schema.qlpColaboradores, 'lider_colab');
  const rows = await db
    .select({ chapa: schema.qlpColaboradores.chapa, lider: liderColab.nome })
    .from(schema.qlpVinculos)
    .innerJoin(schema.qlpColaboradores, eq(schema.qlpColaboradores.id, schema.qlpVinculos.colaboradorId))
    .innerJoin(schema.qlpLideres, eq(schema.qlpLideres.id, schema.qlpVinculos.liderId))
    .innerJoin(liderColab, eq(liderColab.id, schema.qlpLideres.colaboradorId));
  return new Map(rows.map((r) => [r.chapa, r.lider]));
}

/**
 * Pendências de avaliação de experiência (35 e 70 dias) da sessão: uma por colaborador × etapa pendente
 * (PFP/PDP). Gestor = líder do QLP; sem líder, o avaliador do arquivo; sem nenhum, "Sem gestor".
 * Filial vê só a sua; regional/nacional, o escopo dele; admin vê tudo.
 */
export async function buscarExperiencia(s: Session, importId?: string | null) {
  const hoje = hojeBrasilia();
  const imports = await db
    .select()
    .from(schema.expImports)
    .where(eq(schema.expImports.concluida, true))
    .orderBy(desc(schema.expImports.dataRef));
  const resumos: ExpResumoImport[] = imports.map((i) => ({ id: i.id, dataRef: i.dataRef, colaboradores: i.totalColaboradores }));
  const atual = imports.find((i) => i.id === importId) ?? imports[0] ?? null;
  if (!atual) return { hoje, imports: resumos, atualId: null, dataRef: null, pendencias: [] as ExpPendencia[], totalColab: 0, evolucao: [] as { dataRef: string; pendencias: number }[] };

  const escopoRaw = getFiliaisCodigosVisiveis(s);
  const escopo = escopoRaw ? new Set(escopoRaw.map(normalizarCodigoFilial)) : null;

  const [linhas, lideres, evo] = await Promise.all([
    db.select().from(schema.expLinhas).where(eq(schema.expLinhas.importId, atual.id)),
    liderPorChapa(),
    db
      .select({
        importId: schema.expLinhas.importId,
        n: sql<number>`(count(*) filter (where ${schema.expLinhas.status35} in ('PFP','PDP')) + count(*) filter (where ${schema.expLinhas.status70} in ('PFP','PDP')))::int`,
      })
      .from(schema.expLinhas)
      .groupBy(schema.expLinhas.importId),
  ]);

  const pendencias: ExpPendencia[] = [];
  let totalColab = 0;
  for (const l of linhas) {
    if (escopo && !escopo.has(l.filialCodigo)) continue;
    totalColab++;
    const gestor = lideres.get(l.chapa) ?? l.avaliadorArquivo ?? SEM_GESTOR;
    const etapas: Array<['35' | '70', string | null, string | null]> = [
      ['35', l.status35, l.prev35],
      ['70', l.status70, l.prev70],
    ];
    for (const [etapa, status, prazo] of etapas) {
      if (!prazo || !statusPendente(status)) continue;
      pendencias.push({
        filial: l.filialCodigo, chapa: l.chapa, nome: l.nome, admissao: l.dtAdmissao,
        gestor, etapa, prazo, ...classificar(prazo, hoje),
      });
    }
  }

  const refDe = new Map(imports.map((i) => [i.id, i.dataRef]));
  const evolucao = evo
    .map((e) => ({ dataRef: refDe.get(e.importId) ?? '', pendencias: e.n }))
    .filter((e) => e.dataRef)
    .sort((a, b) => a.dataRef.localeCompare(b.dataRef));

  // A evolução soma a base inteira: só aparece para quem enxerga todas as filiais.
  return { hoje, imports: resumos, atualId: atual.id, dataRef: atual.dataRef, pendencias, totalColab, evolucao: escopo ? [] : evolucao };
}
