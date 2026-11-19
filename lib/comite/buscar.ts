import 'server-only';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import type { Session } from '@/lib/auth/session';
import { filiaisPermitidas } from './acesso';
import { mesAtual, mesValido, tempoEmpresaMeses, turnoDoHorario, type ComiteLancamento } from './tipos';

type Linha = typeof schema.comiteDesligamentos.$inferSelect;

export function paraLancamento(l: Linha): ComiteLancamento {
  const mes = l.mesReferencia.slice(0, 7);
  return {
    id: l.id, filial: l.filialCodigo, chapa: l.chapa, nome: l.nome,
    funcao: l.funcao ?? 'Sem função', secao: l.secao ?? 'Sem seção', admissao: l.dtAdmissao,
    idade: l.idade, horario: l.horario, turno: turnoDoHorario(l.horario),
    suspensoes: l.qtdSuspensoes, advertencias: l.qtdAdvertencias, mes,
    justificativa: l.justificativa, criadoPor: l.criadoPor,
    criadoEm: l.createdAt.toISOString(), atualizadoEm: l.updatedAt.toISOString(),
    tempoMeses: tempoEmpresaMeses(l.dtAdmissao, mes),
  };
}

/** Lançamentos do mês dentro do escopo da sessão + meses com lançamento + contagem por filial do mês anterior. */
export async function buscarComite(s: Session, mesParam?: string | null) {
  const permitidas = await filiaisPermitidas(s);
  const codigos = permitidas.map((f) => f.codigo);
  if (codigos.length === 0) return { mes: mesAtual(), meses: [] as string[], lancamentos: [] as ComiteLancamento[], anteriorPorFilial: {} as Record<string, number>, filiais: permitidas };

  const noEscopo = inArray(schema.comiteDesligamentos.filialCodigo, codigos);
  const mesesRaw = await db
    .selectDistinct({ m: sql<string>`to_char(${schema.comiteDesligamentos.mesReferencia}, 'YYYY-MM')` })
    .from(schema.comiteDesligamentos)
    .where(noEscopo);
  const meses = mesesRaw.map((r) => r.m).sort().reverse();
  const mes = mesParam && mesValido(mesParam) ? mesParam : meses[0] ?? mesAtual();

  const dia1 = `${mes}-01`;
  const ant = new Date(Date.UTC(+mes.slice(0, 4), +mes.slice(5, 7) - 2, 1)).toISOString().slice(0, 10);
  const [linhas, anteriores] = await Promise.all([
    db.select().from(schema.comiteDesligamentos)
      .where(and(noEscopo, eq(schema.comiteDesligamentos.mesReferencia, dia1)))
      .orderBy(desc(schema.comiteDesligamentos.createdAt)),
    db.select({ filial: schema.comiteDesligamentos.filialCodigo, n: sql<number>`count(*)::int` })
      .from(schema.comiteDesligamentos)
      .where(and(noEscopo, eq(schema.comiteDesligamentos.mesReferencia, ant)))
      .groupBy(schema.comiteDesligamentos.filialCodigo),
  ]);
  return {
    mes, meses, filiais: permitidas,
    lancamentos: linhas.map(paraLancamento),
    anteriorPorFilial: Object.fromEntries(anteriores.map((a) => [a.filial, a.n])) as Record<string, number>,
  };
}

/** Um lançamento, só se estiver no escopo da sessão. */
export async function buscarLancamento(s: Session, id: string): Promise<ComiteLancamento | null> {
  const [l] = await db.select().from(schema.comiteDesligamentos).where(eq(schema.comiteDesligamentos.id, id)).limit(1);
  if (!l) return null;
  const ok = (await filiaisPermitidas(s)).some((f) => f.codigo === l.filialCodigo);
  return ok ? paraLancamento(l) : null;
}
