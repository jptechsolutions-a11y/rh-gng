import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from '@/db/client';

export interface MembroTime {
  colaboradorId: string;
  chapa: string;
  nome: string;
  funcao: string;
  tier: string;
  filialId: string | null;
  nivel: number;
}

export async function getTimeEfetivo(liderId: string): Promise<MembroTime[]> {
  const rows = await db.execute<{
    colaborador_id: string;
    chapa: string;
    nome: string;
    funcao: string;
    tier: string;
    filial_id: string | null;
    nivel: number;
  }>(sql`
    WITH RECURSIVE descend AS (
      SELECT
        c.id AS colaborador_id,
        c.chapa, c.nome, c.funcao,
        c.tier_resolvido AS tier,
        c.filial_id,
        1 AS nivel
      FROM qlp_vinculos v
      JOIN qlp_colaboradores c ON c.id = v.colaborador_id
      WHERE v.lider_id = ${liderId}

      UNION ALL

      SELECT
        c2.id AS colaborador_id,
        c2.chapa, c2.nome, c2.funcao,
        c2.tier_resolvido AS tier,
        c2.filial_id,
        d.nivel + 1 AS nivel
      FROM descend d
      JOIN qlp_lideres l2 ON l2.colaborador_id = d.colaborador_id
      JOIN qlp_vinculos v2 ON v2.lider_id = l2.id
      JOIN qlp_colaboradores c2 ON c2.id = v2.colaborador_id
    )
    SELECT * FROM descend ORDER BY nivel, nome
  `);
  return (rows as unknown as Array<{
    colaborador_id: string;
    chapa: string;
    nome: string;
    funcao: string;
    tier: string;
    filial_id: string | null;
    nivel: number;
  }>).map((r) => ({
    colaboradorId: r.colaborador_id,
    chapa: r.chapa,
    nome: r.nome,
    funcao: r.funcao,
    tier: r.tier,
    filialId: r.filial_id,
    nivel: Number(r.nivel),
  }));
}

export interface ResumoLider {
  diretos: number;
  total: number;
}

export async function getResumoLider(liderId: string): Promise<ResumoLider> {
  const [diretosRes, totalRes] = await Promise.all([
    db.execute<{ n: number }>(sql`
      SELECT count(*)::int AS n FROM qlp_vinculos WHERE lider_id = ${liderId}
    `),
    db.execute<{ n: number }>(sql`
      WITH RECURSIVE descend AS (
        SELECT v.colaborador_id FROM qlp_vinculos v WHERE v.lider_id = ${liderId}
        UNION ALL
        SELECT v2.colaborador_id
        FROM descend d
        JOIN qlp_lideres l2 ON l2.colaborador_id = d.colaborador_id
        JOIN qlp_vinculos v2 ON v2.lider_id = l2.id
      )
      SELECT count(*)::int AS n FROM descend
    `),
  ]);
  const diretos = Number((diretosRes as unknown as Array<{ n: number }>)[0]?.n ?? 0);
  const total = Number((totalRes as unknown as Array<{ n: number }>)[0]?.n ?? 0);
  return { diretos, total };
}

export interface KPIs {
  totalAtivos: number;
  comLider: number;
  pendenciasAbertas: number;
  ultimoSync: Date | null;
}

export async function getKPIs(filialId?: string | null): Promise<KPIs> {
  const filial = filialId ?? null;
  const rows = await db.execute<{
    total_ativos: number;
    com_lider: number;
    pendencias_abertas: number;
    ultimo_sync: string | null;
  }>(sql`
    WITH ativos AS (
      SELECT c.id
      FROM qlp_colaboradores c
      WHERE c.ativo
        AND (${filial}::uuid IS NULL OR c.filial_id = ${filial}::uuid)
    )
    SELECT
      (SELECT count(*) FROM ativos)::int AS total_ativos,
      (SELECT count(*) FROM ativos a JOIN qlp_vinculos v ON v.colaborador_id = a.id)::int AS com_lider,
      (SELECT count(*) FROM qlp_pendencias WHERE NOT resolvida)::int AS pendencias_abertas,
      (SELECT max(executado_em) FROM qlp_imports) AS ultimo_sync
  `);
  const r = (rows as unknown as Array<{
    total_ativos: number;
    com_lider: number;
    pendencias_abertas: number;
    ultimo_sync: string | null;
  }>)[0];
  return {
    totalAtivos: Number(r?.total_ativos ?? 0),
    comLider: Number(r?.com_lider ?? 0),
    pendenciasAbertas: Number(r?.pendencias_abertas ?? 0),
    ultimoSync: r?.ultimo_sync ? new Date(r.ultimo_sync) : null,
  };
}

export async function getColaboradoresSemLider(filialId?: string | null) {
  const filial = filialId ?? null;
  return db.execute(sql`
    SELECT c.id, c.chapa, c.nome, c.funcao, c.tier_resolvido AS tier,
           c.filial_id, c.codfilial
    FROM qlp_colaboradores c
    LEFT JOIN qlp_vinculos v ON v.colaborador_id = c.id
    WHERE c.ativo AND v.colaborador_id IS NULL
      AND (${filial}::uuid IS NULL OR c.filial_id = ${filial}::uuid)
    ORDER BY c.nome
  `);
}
