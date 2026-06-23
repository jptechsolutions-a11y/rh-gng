import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from '@/db/client';

/**
 * Agregados de ocorrências do time efetivo de um líder.
 * - team CTE: chapas dos colaboradores subordinados (diretos + indiretos)
 * - Conta linhas em cada snapshot que casem por chapa
 */
export interface OcorrenciasResumo {
  inconsistencias: number;
  bhHoras: number;
  bhValor: number;
  bhColaboradores: number;
  cursosPendentes: number;
  feriadosPendentes: number;
  feriadosValor: number;
  totalTime: number;
  comOcorrencia: number;
}

export async function getOcorrenciasResumo(liderId: string): Promise<OcorrenciasResumo> {
  const rows = await db.execute<{
    inconsistencias: number;
    bh_horas: number;
    bh_valor: number;
    bh_colaboradores: number;
    cursos_pendentes: number;
    feriados_pendentes: number;
    feriados_valor: number;
    total_time: number;
    com_ocorrencia: number;
  }>(sql`
    WITH RECURSIVE team AS (
      SELECT c.id, c.chapa
      FROM qlp_vinculos v
      JOIN qlp_colaboradores c ON c.id = v.colaborador_id
      WHERE v.lider_id = ${liderId}
      UNION ALL
      SELECT c2.id, c2.chapa
      FROM team t
      JOIN qlp_lideres l2 ON l2.colaborador_id = t.id
      JOIN qlp_vinculos v2 ON v2.lider_id = l2.id
      JOIN qlp_colaboradores c2 ON c2.id = v2.colaborador_id
    ),
    chapas AS (
      SELECT DISTINCT chapa FROM team
    )
    SELECT
      (SELECT count(*)::int FROM inconsist_snapshot s WHERE s.chapa IN (SELECT chapa FROM chapas)) AS inconsistencias,
      coalesce((SELECT sum(horas_decimal) FROM bh_snapshot_atual s WHERE s.chapa IN (SELECT chapa FROM chapas)), 0)::numeric AS bh_horas,
      coalesce((SELECT sum(valor_pgto)   FROM bh_snapshot_atual s WHERE s.chapa IN (SELECT chapa FROM chapas)), 0)::numeric AS bh_valor,
      (SELECT count(DISTINCT chapa)::int FROM bh_snapshot_atual s WHERE s.chapa IN (SELECT chapa FROM chapas)) AS bh_colaboradores,
      (SELECT count(*)::int FROM cursos_snapshot_atual s WHERE s.chapa IN (SELECT chapa FROM chapas) AND s.pendencia IS NOT NULL) AS cursos_pendentes,
      (SELECT count(*)::int FROM feriados_snapshot s WHERE s.chapa IN (SELECT chapa FROM chapas) AND s.pendencia IS NOT NULL) AS feriados_pendentes,
      coalesce((SELECT sum(total) FROM feriados_snapshot s WHERE s.chapa IN (SELECT chapa FROM chapas) AND s.pendencia IS NOT NULL), 0)::numeric AS feriados_valor,
      (SELECT count(DISTINCT chapa)::int FROM chapas) AS total_time,
      (SELECT count(DISTINCT t.chapa)::int FROM chapas t
        WHERE EXISTS (SELECT 1 FROM inconsist_snapshot s WHERE s.chapa = t.chapa)
           OR EXISTS (SELECT 1 FROM bh_snapshot_atual s WHERE s.chapa = t.chapa)
           OR EXISTS (SELECT 1 FROM cursos_snapshot_atual s WHERE s.chapa = t.chapa AND s.pendencia IS NOT NULL)
           OR EXISTS (SELECT 1 FROM feriados_snapshot s WHERE s.chapa = t.chapa AND s.pendencia IS NOT NULL)
      ) AS com_ocorrencia
  `);
  const r = (rows as unknown as Array<{
    inconsistencias: number;
    bh_horas: number;
    bh_valor: number;
    bh_colaboradores: number;
    cursos_pendentes: number;
    feriados_pendentes: number;
    feriados_valor: number;
    total_time: number;
    com_ocorrencia: number;
  }>)[0];
  return {
    inconsistencias: Number(r?.inconsistencias ?? 0),
    bhHoras: Number(r?.bh_horas ?? 0),
    bhValor: Number(r?.bh_valor ?? 0),
    bhColaboradores: Number(r?.bh_colaboradores ?? 0),
    cursosPendentes: Number(r?.cursos_pendentes ?? 0),
    feriadosPendentes: Number(r?.feriados_pendentes ?? 0),
    feriadosValor: Number(r?.feriados_valor ?? 0),
    totalTime: Number(r?.total_time ?? 0),
    comOcorrencia: Number(r?.com_ocorrencia ?? 0),
  };
}

/**
 * Detalhe por colaborador do time — quem tem o quê.
 * Usado na tela de detalhe do líder.
 */
export interface OcorrenciaPorColab {
  colaboradorId: string;
  chapa: string;
  nome: string;
  funcao: string;
  tier: string | null;
  nivelHierarquia: number;
  filialCodigo: string | null;
  inconsistencias: number;
  bhHoras: number;
  bhValor: number;
  cursosPendentes: number;
  feriadosPendentes: number;
  feriadosValor: number;
  totalOcorrencias: number;
}

export async function getOcorrenciasPorColaborador(liderId: string): Promise<OcorrenciaPorColab[]> {
  const rows = await db.execute<{
    colaborador_id: string;
    chapa: string;
    nome: string;
    funcao: string;
    tier: string | null;
    nivel_hierarquia: number;
    filial_codigo: string | null;
    inconsistencias: number;
    bh_horas: number;
    bh_valor: number;
    cursos_pendentes: number;
    feriados_pendentes: number;
    feriados_valor: number;
  }>(sql`
    WITH RECURSIVE team AS (
      SELECT c.id, c.chapa, c.nome, c.funcao, c.tier_resolvido AS tier, c.filial_id, 1 AS nivel_h
      FROM qlp_vinculos v
      JOIN qlp_colaboradores c ON c.id = v.colaborador_id
      WHERE v.lider_id = ${liderId}
      UNION ALL
      SELECT c2.id, c2.chapa, c2.nome, c2.funcao, c2.tier_resolvido, c2.filial_id, t.nivel_h + 1
      FROM team t
      JOIN qlp_lideres l2 ON l2.colaborador_id = t.id
      JOIN qlp_vinculos v2 ON v2.lider_id = l2.id
      JOIN qlp_colaboradores c2 ON c2.id = v2.colaborador_id
    )
    SELECT
      t.id AS colaborador_id,
      t.chapa,
      t.nome,
      t.funcao,
      t.tier,
      t.nivel_h AS nivel_hierarquia,
      f.codigo AS filial_codigo,
      (SELECT count(*)::int FROM inconsist_snapshot s WHERE s.chapa = t.chapa) AS inconsistencias,
      coalesce((SELECT sum(horas_decimal) FROM bh_snapshot_atual s WHERE s.chapa = t.chapa), 0)::numeric AS bh_horas,
      coalesce((SELECT sum(valor_pgto)   FROM bh_snapshot_atual s WHERE s.chapa = t.chapa), 0)::numeric AS bh_valor,
      (SELECT count(*)::int FROM cursos_snapshot_atual s WHERE s.chapa = t.chapa AND s.pendencia IS NOT NULL) AS cursos_pendentes,
      (SELECT count(*)::int FROM feriados_snapshot s WHERE s.chapa = t.chapa AND s.pendencia IS NOT NULL) AS feriados_pendentes,
      coalesce((SELECT sum(total) FROM feriados_snapshot s WHERE s.chapa = t.chapa AND s.pendencia IS NOT NULL), 0)::numeric AS feriados_valor
    FROM team t
    LEFT JOIN filiais f ON f.id = t.filial_id
    ORDER BY t.nivel_h, t.nome
  `);
  return (rows as unknown as Array<{
    colaborador_id: string;
    chapa: string;
    nome: string;
    funcao: string;
    tier: string | null;
    nivel_hierarquia: number;
    filial_codigo: string | null;
    inconsistencias: number;
    bh_horas: number;
    bh_valor: number;
    cursos_pendentes: number;
    feriados_pendentes: number;
    feriados_valor: number;
  }>).map((r) => {
    const inconsist = Number(r.inconsistencias ?? 0);
    const cursos = Number(r.cursos_pendentes ?? 0);
    const feriados = Number(r.feriados_pendentes ?? 0);
    const bhHoras = Number(r.bh_horas ?? 0);
    return {
      colaboradorId: r.colaborador_id,
      chapa: r.chapa,
      nome: r.nome,
      funcao: r.funcao,
      tier: r.tier,
      nivelHierarquia: Number(r.nivel_hierarquia ?? 1),
      filialCodigo: r.filial_codigo,
      inconsistencias: inconsist,
      bhHoras,
      bhValor: Number(r.bh_valor ?? 0),
      cursosPendentes: cursos,
      feriadosPendentes: feriados,
      feriadosValor: Number(r.feriados_valor ?? 0),
      totalOcorrencias: inconsist + cursos + feriados + (bhHoras !== 0 ? 1 : 0),
    };
  });
}

/**
 * Agregados de ocorrências para uma lista de líderes (usado na listagem).
 * Computa em uma query só para evitar N+1.
 */
export interface OcorrenciasPorLider {
  liderId: string;
  inconsistencias: number;
  bhHoras: number;
  bhValor: number;
  cursosPendentes: number;
  feriadosPendentes: number;
  totalTime: number;
}

export async function getOcorrenciasPorLideres(liderIds: string[]): Promise<Map<string, OcorrenciasPorLider>> {
  if (liderIds.length === 0) return new Map();

  const rows = await db.execute<{
    lider_id: string;
    inconsistencias: number;
    bh_horas: number;
    bh_valor: number;
    cursos_pendentes: number;
    feriados_pendentes: number;
    total_time: number;
  }>(sql`
    WITH RECURSIVE team AS (
      SELECT v.lider_id AS root_lider, c.id, c.chapa
      FROM qlp_vinculos v
      JOIN qlp_colaboradores c ON c.id = v.colaborador_id
      WHERE v.lider_id::text IN (${sql.join(liderIds.map((id) => sql`${id}`), sql`, `)})
      UNION ALL
      SELECT t.root_lider, c2.id, c2.chapa
      FROM team t
      JOIN qlp_lideres l2 ON l2.colaborador_id = t.id
      JOIN qlp_vinculos v2 ON v2.lider_id = l2.id
      JOIN qlp_colaboradores c2 ON c2.id = v2.colaborador_id
    )
    SELECT
      t.root_lider AS lider_id,
      count(DISTINCT t.chapa)::int AS total_time,
      coalesce(sum((SELECT count(*) FROM inconsist_snapshot s WHERE s.chapa = t.chapa)), 0)::int AS inconsistencias,
      coalesce(sum((SELECT sum(horas_decimal) FROM bh_snapshot_atual s WHERE s.chapa = t.chapa)), 0)::numeric AS bh_horas,
      coalesce(sum((SELECT sum(valor_pgto)   FROM bh_snapshot_atual s WHERE s.chapa = t.chapa)), 0)::numeric AS bh_valor,
      coalesce(sum((SELECT count(*) FROM cursos_snapshot_atual s WHERE s.chapa = t.chapa AND s.pendencia IS NOT NULL)), 0)::int AS cursos_pendentes,
      coalesce(sum((SELECT count(*) FROM feriados_snapshot s WHERE s.chapa = t.chapa AND s.pendencia IS NOT NULL)), 0)::int AS feriados_pendentes
    FROM team t
    GROUP BY t.root_lider
  `);

  const map = new Map<string, OcorrenciasPorLider>();
  for (const r of (rows as unknown as Array<{
    lider_id: string;
    inconsistencias: number;
    bh_horas: number;
    bh_valor: number;
    cursos_pendentes: number;
    feriados_pendentes: number;
    total_time: number;
  }>)) {
    map.set(r.lider_id, {
      liderId: r.lider_id,
      inconsistencias: Number(r.inconsistencias ?? 0),
      bhHoras: Number(r.bh_horas ?? 0),
      bhValor: Number(r.bh_valor ?? 0),
      cursosPendentes: Number(r.cursos_pendentes ?? 0),
      feriadosPendentes: Number(r.feriados_pendentes ?? 0),
      totalTime: Number(r.total_time ?? 0),
    });
  }
  return map;
}
