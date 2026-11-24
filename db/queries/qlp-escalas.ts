import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from '@/db/client';
import type { LinhaCruzamento } from '@/lib/qlp/escala';
import { rotuloTurno, turnoDoHorario, type Turno } from '@/lib/qlp/turno';

export interface FilialOpt {
  id: string;
  codigo: string;
  nome: string;
}

export interface EscalaContagem {
  id: string;
  nome: string;
  dias: number[];
  ativo: boolean;
  /** Colaboradores ativos (respeita os filtros de filial e turno). */
  qtd: number;
  /** Colaboradores ativos em todas as filiais e turnos — decide se dá para excluir a escala. */
  qtdGeral: number;
}

export interface IndicadoresEscalas {
  total: number;
  comEscala: number;
  semEscala: number;
  escalas: EscalaContagem[];
  porFuncao: LinhaCruzamento[];
  porSecao: LinhaCruzamento[];
  porFilial: LinhaCruzamento[];
  porTurno: LinhaCruzamento[];
}

/** 'sem' = só quem não tem horário legível; nulo = todos os turnos. */
export type FiltroTurno = Turno | 'sem' | null;

export async function listarFiliaisAtivas(): Promise<FilialOpt[]> {
  const rows = await db.execute(sql`
    SELECT id, codigo, nome FROM filiais WHERE ativa ORDER BY codigo
  `);
  return rows as unknown as FilialOpt[];
}

interface GrupoRaw {
  filial: string;
  funcao: string;
  secao: string;
  horario: string | null;
  escala_id: string | null;
  qtd: number;
}

/**
 * Contagens de colaboradores ativos por escala e cruzamentos (função, seção, filial, turno) × escala.
 * `filialId` nulo = todas as filiais. O turno sai da hora de entrada do `horario`, então o filtro
 * de turno é aplicado aqui, depois da consulta (a consulta já vem agrupada, são poucas linhas).
 */
export async function getIndicadoresEscalas(
  filialId: string | null,
  turnoFiltro: FiltroTurno = null,
): Promise<IndicadoresEscalas> {
  const [escalasRaw, gruposRaw] = await Promise.all([
    db.execute(sql`
      SELECT
        e.id, e.nome, e.dias, e.ativo,
        (SELECT count(*) FROM qlp_colaboradores c
          WHERE c.escala_id = e.id AND c.ativo)::int AS qtd_geral
      FROM qlp_escalas e
      ORDER BY e.ativo DESC, lower(e.nome)
    `),
    db.execute(sql`
      SELECT
        coalesce(f.codigo || ' · ' || f.nome, 'Sem filial') AS filial,
        coalesce(nullif(trim(c.funcao), ''), 'Sem função') AS funcao,
        coalesce(nullif(trim(c.secao), ''), 'Sem seção') AS secao,
        c.horario,
        c.escala_id,
        count(*)::int AS qtd
      FROM qlp_colaboradores c
      LEFT JOIN filiais f ON f.id = c.filial_id
      WHERE c.ativo AND (${filialId}::uuid IS NULL OR c.filial_id = ${filialId}::uuid)
      GROUP BY 1, 2, 3, 4, 5
    `),
  ]);

  const grupos = (gruposRaw as unknown as GrupoRaw[]).flatMap((g) => {
    const turno = turnoDoHorario(g.horario);
    if (turnoFiltro === 'sem' ? turno !== null : turnoFiltro !== null && turno !== turnoFiltro) return [];
    return [{ ...g, qtd: Number(g.qtd), turno }];
  });

  const porFuncao: LinhaCruzamento[] = [];
  const porSecao: LinhaCruzamento[] = [];
  const porFilial: LinhaCruzamento[] = [];
  const porTurno: LinhaCruzamento[] = [];
  const qtdPorEscala = new Map<string, number>();
  let total = 0;
  let semEscala = 0;

  for (const g of grupos) {
    total += g.qtd;
    if (g.escala_id === null) semEscala += g.qtd;
    else qtdPorEscala.set(g.escala_id, (qtdPorEscala.get(g.escala_id) ?? 0) + g.qtd);
    porFuncao.push({ chave: g.funcao, escalaId: g.escala_id, qtd: g.qtd });
    porSecao.push({ chave: g.secao, escalaId: g.escala_id, qtd: g.qtd });
    porFilial.push({ chave: g.filial, escalaId: g.escala_id, qtd: g.qtd });
    porTurno.push({ chave: rotuloTurno(g.turno), escalaId: g.escala_id, qtd: g.qtd });
  }

  const escalas = (
    escalasRaw as unknown as {
      id: string;
      nome: string;
      dias: number[];
      ativo: boolean;
      qtd_geral: number;
    }[]
  ).map((r) => ({
    id: r.id,
    nome: r.nome,
    dias: r.dias,
    ativo: r.ativo,
    qtd: qtdPorEscala.get(r.id) ?? 0,
    qtdGeral: Number(r.qtd_geral),
  }));

  return { total, comEscala: total - semEscala, semEscala, escalas, porFuncao, porSecao, porFilial, porTurno };
}
