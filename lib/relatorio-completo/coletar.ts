import 'server-only';
import { and, eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import { fetchSnapshotRows } from '@/lib/indicadores/bh-db';
import { fetchInconsistRows } from '@/lib/indicadores/inconsist-db';
import { fetchCursosRows } from '@/lib/indicadores/cursos-db';
import { fetchFeriadosRows } from '@/lib/indicadores/feriados-db';
import { agregarResumo, top5Por } from '@/lib/indicadores/bh-queries';
import { agregarResumoInconsist, top5PorInconsist } from '@/lib/indicadores/inconsist-queries';
import { agregarResumoCursos, top5PorCursos } from '@/lib/indicadores/cursos-queries';
import { agregarResumoFeriados, top5PorFeriados } from '@/lib/indicadores/feriados-queries';
import { posicaoNoRanking, type TotalFilial } from './ranking';
import type { DadosFilialRelatorio, IndicadorResumo } from './tipos';

type Chave = IndicadorResumo['chave'];

const TITULOS: Record<Chave, string> = {
  bh: 'Banco de Horas',
  inconsist: 'Inconsistências',
  cursos: 'Cursos Obrigatórios',
  feriados: 'Feriados Pendentes',
  vagas: 'Vagas em Aberto',
};

const fmtHoras = (h: number) => `${h.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} h`;
const fmtInt = (n: number) => n.toLocaleString('pt-BR');

// ---------- parte pura (testada) ----------

export type EntradaResumoExecutivo = {
  filialId: string;
  totaisPorIndicador: Record<Chave, TotalFilial[]>;
  valores: Record<Chave, number>;
  variacoes: Partial<Record<Chave, { deltaPct: number | null; tendencia: 'melhorou' | 'piorou' | 'neutro' }>>;
};

export function montarResumoExecutivo(e: EntradaResumoExecutivo): IndicadorResumo[] {
  const ordem: Chave[] = ['bh', 'inconsist', 'cursos', 'feriados', 'vagas'];
  return ordem.map((chave) => {
    const { posicao, total } = posicaoNoRanking(e.filialId, e.totaisPorIndicador[chave]);
    const valor = e.valores[chave];
    const valorFmt = chave === 'bh' ? fmtHoras(valor) : fmtInt(valor);
    return {
      chave,
      titulo: TITULOS[chave],
      valorFmt,
      variacao: e.variacoes[chave] ?? null,
      posicao,
      totalFiliais: total,
    };
  });
}

// ---------- contexto (fetch único p/ todo o escopo) ----------

export type Contexto = Awaited<ReturnType<typeof coletarContexto>>;

export async function coletarContexto(escopo: string[] | null) {
  const [bhAtual, bhAnterior, inconsist, cursosAtual, cursosAnterior, feriados] = await Promise.all([
    fetchSnapshotRows(schema.bhSnapshotAtual, escopo),
    fetchSnapshotRows(schema.bhSnapshotAnterior, escopo),
    fetchInconsistRows(escopo),
    fetchCursosRows(schema.cursosSnapshotAtual, escopo),
    fetchCursosRows(schema.cursosSnapshotAnterior, escopo),
    fetchFeriadosRows(escopo),
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
    meta: {
      bh: metas[0][0]?.ts?.toISOString() ?? null,
      inconsist: metas[1][0]?.ts?.toISOString() ?? null,
      cursos: metas[2][0]?.ts?.toISOString() ?? null,
      feriados: metas[3][0]?.ts?.toISOString() ?? null,
    },
  };
}

// ---------- por filial ----------

const somaHoras = (rows: { filialId: string | null; horasDecimal: number }[]) => {
  const m = new Map<string, number>();
  for (const r of rows) if (r.filialId) m.set(r.filialId, (m.get(r.filialId) ?? 0) + r.horasDecimal);
  return [...m.entries()].map(([filialId, valor]) => ({ filialId, valor }));
};
const contaPorFilial = (rows: { filialId: string | null }[]): TotalFilial[] => {
  const m = new Map<string, number>();
  for (const r of rows) if (r.filialId) m.set(r.filialId, (m.get(r.filialId) ?? 0) + 1);
  return [...m.entries()].map(([filialId, valor]) => ({ filialId, valor }));
};

export function coletarFilial(
  filial: { id: string; codigo: string; nome: string },
  ctx: Contexto,
): DadosFilialRelatorio {
  const id = filial.id;
  const only = <T extends { filialId: string | null }>(rows: T[]) => rows.filter((r) => r.filialId === id);

  const bhRows = only(ctx.bhAtual);
  const bhRowsAnt = only(ctx.bhAnterior);
  const incRows = only(ctx.inconsist);
  const cursosRows = only(ctx.cursosAtual);
  const cursosRowsAnt = only(ctx.cursosAnterior);
  const ferRows = only(ctx.feriados);
  const vagasRows = ctx.vagas.filter((v) => v.filialId === id);
  const vagasAbertas = vagasRows.filter((v) => v.statusSistema);

  const bhResumo = agregarResumo(bhRows);
  const bhResumoAnt = agregarResumo(bhRowsAnt);
  const cursosResumo = agregarResumoCursos(cursosRows);
  const cursosResumoAnt = agregarResumoCursos(cursosRowsAnt);
  const incResumo = agregarResumoInconsist(incRows);
  const ferResumo = agregarResumoFeriados(ferRows);

  const porSecaoMap = new Map<string, number>();
  for (const v of vagasAbertas) {
    const k = (v.secao ?? 'Sem seção').trim() || 'Sem seção';
    porSecaoMap.set(k, (porSecaoMap.get(k) ?? 0) + 1);
  }
  const totalVagas = vagasAbertas.length || 1;
  const porSecao = [...porSecaoMap.entries()]
    .map(([label, valor]) => ({ label, valor, pct: Math.round((valor / totalVagas) * 1000) / 10 }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5);
  const porStatusMap = new Map<string, number>();
  for (const v of vagasRows) porStatusMap.set(v.statusNome, (porStatusMap.get(v.statusNome) ?? 0) + 1);
  const porStatus = [...porStatusMap.entries()]
    .map(([label, valor]) => ({ label, valor }))
    .sort((a, b) => b.valor - a.valor);

  const pct = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 1000) / 10 : null);
  const tend = (d: number | null): 'melhorou' | 'piorou' | 'neutro' =>
    d === null || Math.abs(d) < 1 ? 'neutro' : d > 0 ? 'piorou' : 'melhorou';
  const bhPct = pct(bhResumo.totalHoras, bhResumoAnt.totalHoras);
  const cursosPct = pct(cursosResumo.totalPendencias, cursosResumoAnt.totalPendencias);

  const resumoExecutivo = montarResumoExecutivo({
    filialId: id,
    totaisPorIndicador: {
      bh: somaHoras(ctx.bhAtual),
      inconsist: contaPorFilial(ctx.inconsist),
      cursos: contaPorFilial(ctx.cursosAtual),
      feriados: contaPorFilial(ctx.feriados),
      vagas: contaPorFilial(ctx.vagas.filter((v) => v.statusSistema)),
    },
    valores: {
      bh: bhResumo.totalHoras,
      inconsist: incResumo.totalInconsist,
      cursos: cursosResumo.totalPendencias,
      feriados: ferResumo.totalPendencias,
      vagas: vagasAbertas.length,
    },
    variacoes: {
      bh: { deltaPct: bhPct, tendencia: tend(bhPct) },
      cursos: { deltaPct: cursosPct, tendencia: tend(cursosPct) },
    },
  });

  return {
    filial,
    geradoEm: new Date().toISOString(),
    resumoExecutivo,
    bh: bhRows.length ? { resumo: bhResumo, resumoAnterior: bhResumoAnt, topSecoes: top5Por(bhRows, 'secao'), atualizadoEm: ctx.meta.bh } : null,
    inconsist: incRows.length ? { resumo: incResumo, topTipos: top5PorInconsist(incRows, 'tipo'), atualizadoEm: ctx.meta.inconsist } : null,
    cursos: cursosRows.length ? { resumo: cursosResumo, resumoAnterior: cursosResumoAnt, topTipos: top5PorCursos(cursosRows, 'tipo'), atualizadoEm: ctx.meta.cursos } : null,
    feriados: ferRows.length ? { resumo: ferResumo, topSecoes: top5PorFeriados(ferRows, 'secao'), atualizadoEm: ctx.meta.feriados } : null,
    vagas: vagasRows.length ? { totalAbertas: vagasAbertas.length, porStatus, porSecao } : null,
  };
}
