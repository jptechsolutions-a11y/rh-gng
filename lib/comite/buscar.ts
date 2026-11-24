import 'server-only';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import type { Session } from '@/lib/auth/session';
import { filiaisPermitidas } from './acesso';
import { pedidosAnteriores } from './historico';
import {
  mesAtual, mesValido, tempoEmpresaMeses, turnoDoHorario,
  type ComiteLancamento, type Decisao, type PedidoAnterior,
} from './tipos';

type Linha = typeof schema.comiteDesligamentos.$inferSelect;

const decisaoValida = (d: string | null): Decisao | null => (d === 'aprovado' || d === 'nao_aprovado' ? d : null);

/** Converte a linha do banco; o histórico é anexado depois (ver `anexarHistorico`). */
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
    decisao: decisaoValida(l.decisao), decisaoMotivo: l.decisaoMotivo, decididoPor: l.decididoPor,
    decididoEm: l.decididoEm ? l.decididoEm.toISOString() : null,
    historico: [],
  };
}

/** Todos os pedidos NÃO aprovados dessas matrículas (qualquer mês), agrupados por matrícula. */
async function naoAprovadosPorChapa(chapas: string[]): Promise<Map<string, PedidoAnterior[]>> {
  const mapa = new Map<string, PedidoAnterior[]>();
  if (chapas.length === 0) return mapa;
  const linhas = await db
    .select()
    .from(schema.comiteDesligamentos)
    .where(and(inArray(schema.comiteDesligamentos.chapa, chapas), eq(schema.comiteDesligamentos.decisao, 'nao_aprovado')));
  for (const l of linhas) {
    const lista = mapa.get(l.chapa) ?? [];
    lista.push({
      id: l.id, mes: l.mesReferencia.slice(0, 7), solicitadoEm: l.createdAt.toISOString(), solicitadoPor: l.criadoPor,
      justificativa: l.justificativa, motivoReprovacao: l.decisaoMotivo ?? '—',
      decididoPor: l.decididoPor, decididoEm: l.decididoEm ? l.decididoEm.toISOString() : null,
    });
    mapa.set(l.chapa, lista);
  }
  return mapa;
}

/** Preenche `historico` de cada lançamento com os pedidos não aprovados de meses anteriores. */
export async function anexarHistorico(lancs: ComiteLancamento[]): Promise<ComiteLancamento[]> {
  const porChapa = await naoAprovadosPorChapa(Array.from(new Set(lancs.map((l) => l.chapa))));
  return lancs.map((l) => ({ ...l, historico: pedidosAnteriores(l.mes, porChapa.get(l.chapa) ?? []) }));
}

/** Pedidos anteriores não aprovados de uma matrícula, para avisar no lançamento (antes do mês informado). */
export async function historicoDaChapa(chapa: string, mes: string): Promise<PedidoAnterior[]> {
  const porChapa = await naoAprovadosPorChapa([chapa]);
  return pedidosAnteriores(mes, porChapa.get(chapa) ?? []);
}

/** Lançamento sem idade/horário gravados (QLP ainda sem a coluna na época): completa com o QLP atual. */
async function completarDoQlp(linhas: Linha[]): Promise<Linha[]> {
  const faltando = linhas.filter((l) => l.idade == null || l.horario == null).map((l) => l.chapa);
  if (faltando.length === 0) return linhas;
  const qlp = await db
    .select({ chapa: schema.qlpColaboradores.chapa, idade: schema.qlpColaboradores.idade, horario: schema.qlpColaboradores.horario })
    .from(schema.qlpColaboradores)
    .where(inArray(schema.qlpColaboradores.chapa, faltando));
  const porChapa = new Map(qlp.map((q) => [q.chapa, q]));
  return linhas.map((l) => {
    const q = porChapa.get(l.chapa);
    return q ? { ...l, idade: l.idade ?? q.idade, horario: l.horario ?? q.horario } : l;
  });
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
    lancamentos: await anexarHistorico((await completarDoQlp(linhas)).map(paraLancamento)),
    anteriorPorFilial: Object.fromEntries(anteriores.map((a) => [a.filial, a.n])) as Record<string, number>,
  };
}

/** Um lançamento, só se estiver no escopo da sessão. */
export async function buscarLancamento(s: Session, id: string): Promise<ComiteLancamento | null> {
  const [l] = await db.select().from(schema.comiteDesligamentos).where(eq(schema.comiteDesligamentos.id, id)).limit(1);
  if (!l) return null;
  const ok = (await filiaisPermitidas(s)).some((f) => f.codigo === l.filialCodigo);
  if (!ok) return null;
  const [com] = await anexarHistorico([paraLancamento((await completarDoQlp([l]))[0]!)]);
  return com ?? null;
}
