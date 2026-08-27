import 'server-only';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import { fetchSnapshotRows } from '@/lib/indicadores/bh-db';
import { fetchInconsistRows } from '@/lib/indicadores/inconsist-db';
import { fetchCursosRows } from '@/lib/indicadores/cursos-db';
import { fetchFeriadosRows } from '@/lib/indicadores/feriados-db';
import { calcVariacao } from '@/app/(app)/indicadores/bh/variacao';
import { posicaoNoRanking } from './ranking';
import { leituraRanking } from './texto';
import {
  CLASSIFICACOES,
  carregarMapaClassificacao,
  classificarSecao,
  type Classificacao,
} from './classificacao-secao';
import type {
  CDIndicador,
  ChaveIndicador,
  DadosConsolidado,
  RankingIndicador,
  VagasDetalheCD,
} from './tipos';

// ---------- contexto (fetch único p/ todo o escopo) ----------

export type Contexto = Awaited<ReturnType<typeof coletarContexto>>;

export async function coletarContexto(escopo: string[] | null) {
  const vagasQuadroQuery = db
    .select({
      filialId: schema.vagasQuadroLinhas.filialId,
      secao: schema.vagasQuadroLinhas.secao,
      limite: schema.vagasQuadroLinhas.limite,
      alocados: schema.vagasQuadroLinhas.alocados,
    })
    .from(schema.vagasQuadroLinhas);

  const [
    bhAtual,
    bhAnterior,
    inconsist,
    cursosAtual,
    cursosAnterior,
    feriados,
    vagasQuadro,
    statusAtivos,
    classifMapa,
  ] = await Promise.all([
    fetchSnapshotRows(schema.bhSnapshotAtual, escopo),
    fetchSnapshotRows(schema.bhSnapshotAnterior, escopo),
    fetchInconsistRows(escopo),
    fetchCursosRows(schema.cursosSnapshotAtual, escopo),
    fetchCursosRows(schema.cursosSnapshotAnterior, escopo),
    fetchFeriadosRows(escopo),
    escopo
      ? vagasQuadroQuery.where(inArray(schema.vagasQuadroLinhas.filialId, escopo))
      : vagasQuadroQuery,
    db
      .select({ nome: schema.vagasStatus.nome })
      .from(schema.vagasStatus)
      .where(eq(schema.vagasStatus.ativo, true))
      .orderBy(asc(schema.vagasStatus.ordem)),
    carregarMapaClassificacao(),
  ]);

  const vagasCond = [eq(schema.vagas.ativa, true)];
  if (escopo) vagasCond.push(inArray(schema.vagas.filialId, escopo));
  const vagas = await db
    .select({
      filialId: schema.vagas.filialId,
      statusId: schema.vagas.statusId,
      statusNome: schema.vagasStatus.nome,
      statusSistema: schema.vagasStatus.sistema,
      secao: schema.vagas.secao,
    })
    .from(schema.vagas)
    .innerJoin(schema.vagasStatus, eq(schema.vagasStatus.id, schema.vagas.statusId))
    .where(and(...vagasCond));

  const metas = await Promise.all([
    db.select({ ts: schema.bhMeta.ultimaAtualizacao }).from(schema.bhMeta).limit(1),
    db.select({ ts: schema.inconsistMeta.ultimaAtualizacao }).from(schema.inconsistMeta).limit(1),
    db.select({ ts: schema.cursosMeta.ultimaAtualizacao }).from(schema.cursosMeta).limit(1),
    db.select({ ts: schema.feriadosMeta.ultimaAtualizacao }).from(schema.feriadosMeta).limit(1),
  ]);

  return {
    bhAtual, bhAnterior, inconsist, cursosAtual, cursosAnterior, feriados, vagas,
    vagasQuadro,
    statusVagas: statusAtivos.map((r) => r.nome),
    classifMapa,
    meta: {
      bh: metas[0][0]?.ts?.toISOString() ?? null,
      inconsist: metas[1][0]?.ts?.toISOString() ?? null,
      cursos: metas[2][0]?.ts?.toISOString() ?? null,
      feriados: metas[3][0]?.ts?.toISOString() ?? null,
    },
  };
}

// ---------- ranking por indicador (parte pura, testada) ----------

type CDBasico = { filialId: string; codigo: string; nome: string };

export type EntradaRanking = {
  chave: ChaveIndicador;
  titulo: string;
  temHistorico: boolean;
  metaNula: boolean;
  cds: CDBasico[];
  valorAtual: Map<string, number>;
  valorAnterior: Map<string, number>;
  fmt: (n: number) => string;
};

export function montarRankingIndicador(e: EntradaRanking): RankingIndicador {
  const totais = e.cds.map((c) => ({ filialId: c.filialId, valor: e.valorAtual.get(c.filialId) ?? 0 }));

  const cds: CDIndicador[] = e.cds
    .map((c): CDIndicador => {
      const valor = e.valorAtual.get(c.filialId) ?? 0;
      const { posicao } = posicaoNoRanking(c.filialId, totais);
      let variacao: CDIndicador['variacao'] = null;
      if (e.temHistorico) {
        const v = calcVariacao(valor, e.valorAnterior.get(c.filialId) ?? 0);
        variacao = { deltaPct: v.deltaPct, tendencia: v.tendencia };
      }
      return {
        filialId: c.filialId, codigo: c.codigo, nome: c.nome,
        valor, valorFmt: e.fmt(valor),
        variacao,
        posicao: posicao ?? 1,
      };
    })
    .sort((a, b) => a.valor - b.valor || a.nome.localeCompare(b.nome));

  const semDados = e.metaNula && cds.every((c) => c.valor === 0);

  return {
    chave: e.chave,
    titulo: e.titulo,
    temHistorico: e.temHistorico,
    semDados,
    cds,
    leitura: leituraRanking(e.chave, cds),
  };
}

// ---------- consolidado (orquestra fetch + ranking) ----------

const fmtHoras = (n: number) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} h`;
const fmtInt = (n: number) => n.toLocaleString('pt-BR');

const contarPorFilial = <T extends { filialId: string | null }>(
  rows: T[],
  pred: (r: T) => boolean = () => true,
) => {
  const m = new Map<string, number>();
  for (const r of rows) if (r.filialId && pred(r)) m.set(r.filialId, (m.get(r.filialId) ?? 0) + 1);
  return m;
};
const somarHorasPorFilial = (rows: { filialId: string | null; horasDecimal: number }[]) => {
  const m = new Map<string, number>();
  for (const r of rows) if (r.filialId) m.set(r.filialId, Math.round((m.get(r.filialId) ?? 0) + r.horasDecimal));
  return m;
};

export function coletarConsolidado(ctx: Contexto, cds: CDBasico[]): DadosConsolidado {
  const rankings: RankingIndicador[] = [
    montarRankingIndicador({
      chave: 'bh', titulo: 'Banco de Horas', temHistorico: true, metaNula: ctx.meta.bh === null, cds,
      valorAtual: somarHorasPorFilial(ctx.bhAtual), valorAnterior: somarHorasPorFilial(ctx.bhAnterior),
      fmt: fmtHoras,
    }),
    montarRankingIndicador({
      chave: 'inconsist', titulo: 'Inconsistências', temHistorico: false, metaNula: ctx.meta.inconsist === null, cds,
      valorAtual: contarPorFilial(ctx.inconsist), valorAnterior: new Map(), fmt: fmtInt,
    }),
    montarRankingIndicador({
      chave: 'cursos', titulo: 'Cursos Obrigatórios', temHistorico: true, metaNula: ctx.meta.cursos === null, cds,
      valorAtual: contarPorFilial(ctx.cursosAtual), valorAnterior: contarPorFilial(ctx.cursosAnterior), fmt: fmtInt,
    }),
    montarRankingIndicador({
      chave: 'feriados', titulo: 'Feriados Pendentes', temHistorico: false, metaNula: ctx.meta.feriados === null, cds,
      valorAtual: contarPorFilial(ctx.feriados), valorAnterior: new Map(), fmt: fmtInt,
    }),
    montarRankingIndicador({
      chave: 'vagas', titulo: 'Vagas em Aberto', temHistorico: false, metaNula: false, cds,
      valorAtual: contarPorFilial(ctx.vagas, (r) => r.statusSistema === true), valorAnterior: new Map(), fmt: fmtInt,
    }),
  ];

  const zerosClassif = (): Record<Classificacao, number> =>
    Object.fromEntries(CLASSIFICACOES.map((c) => [c, 0])) as Record<Classificacao, number>;

  const vagasDetalhe: VagasDetalheCD[] = cds
    .map((cd): VagasDetalheCD => {
      const quadro = ctx.vagasQuadro.filter((q) => q.filialId === cd.filialId);
      const abertas = ctx.vagas.filter((v) => v.filialId === cd.filialId);
      const contratarPorClassificacao = zerosClassif();
      const porStatus: Record<string, number> = {};
      for (const v of abertas) {
        contratarPorClassificacao[classificarSecao(v.secao, ctx.classifMapa)] += 1;
        porStatus[v.statusNome] = (porStatus[v.statusNome] ?? 0) + 1;
      }
      return {
        filialId: cd.filialId, codigo: cd.codigo, nome: cd.nome,
        contratarPorClassificacao,
        aprov: quadro.reduce((a, q) => a + q.limite, 0),
        ativo: quadro.reduce((a, q) => a + q.alocados, 0),
        totalAbertas: abertas.length,
        porStatus,
      };
    })
    .sort((a, b) => b.totalAbertas - a.totalAbertas || a.nome.localeCompare(b.nome));

  return {
    geradoEm: new Date().toISOString(),
    totalCDs: cds.length,
    rankings,
    vagasDetalhe,
    statusVagas: ctx.statusVagas,
  };
}
