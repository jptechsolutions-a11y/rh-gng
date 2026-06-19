'use server';

import { db, schema } from '@/db/client';
import { eq, inArray, sql } from 'drizzle-orm';
import * as XLSX from 'xlsx';
import { requireSession, getFiliaisVisiveis, getFiliaisRanking } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';
import { parseFeriadosWorkbook } from '@/lib/indicadores/feriados-parser';
import {
  agregarResumoFeriados, top5PorFeriados,
  agregarResumoPorFilialFeriados, montarDetalhadoFeriados,
  type ResumoFeriados, type ResumoFilialFeriados, type DetalhadoFeriadosRow,
} from '@/lib/indicadores/feriados-queries';
import { fetchFeriadosRows } from '@/lib/indicadores/feriados-db';

export type ImportarFeriadosResult = {
  inserted: number;
  abasProcessadas: string[];
  totalLidoBruto: number;
  totalNaoPerlog: number;
  warnings: Array<{ aba?: string; linha?: number; chapa?: string; motivo: string }>;
};

export async function importarFeriados(formData: FormData): Promise<ImportarFeriadosResult> {
  const s = await requireSession('admin');
  const file = formData.get('arquivo');
  if (!(file instanceof File)) throw new Error('Arquivo ausente');
  const buf = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buf, { type: 'buffer' });
  const parseResult = parseFeriadosWorkbook(wb);
  const { rows, abasProcessadas, totalLidoBruto, totalNaoPerlog } = parseResult;
  const warnings: ImportarFeriadosResult['warnings'] = parseResult.warnings.slice();

  const codigos = [...new Set(rows.map((r) => r.codfilial))];
  const filiaisDb = codigos.length
    ? await db.select({ id: schema.filiais.id, codigo: schema.filiais.codigo })
        .from(schema.filiais)
        .where(inArray(schema.filiais.codigo, codigos))
    : [];
  const mapFilial = new Map(filiaisDb.map((f) => [f.codigo, f.id]));

  const inserts = rows.map((r) => {
    const fid = mapFilial.get(r.codfilial) ?? null;
    if (!fid) warnings.push({ chapa: r.chapa, motivo: `Filial ${r.codfilial} não cadastrada` });
    return {
      filialId: fid,
      codfilialOrigem: r.codfilial,
      chapa: r.chapa,
      nome: r.nome,
      funcao: r.funcao,
      secao: r.secao,
      codsecao: r.codsecao,
      regional: r.regional,
      bandeira: r.bandeira,
      pendencia: r.pendencia,
      dataFeriado: r.dataFeriado,
      valor: r.valor.toFixed(2),
      dsr: r.dsr.toFixed(2),
      encargos: r.encargos.toFixed(2),
      total: r.total.toFixed(2),
      abaOrigem: r.abaOrigem,
    };
  });

  await db.transaction(async (tx) => {
    await tx.execute(sql`TRUNCATE TABLE ${schema.feriadosSnapshot}`);
    if (inserts.length) {
      for (let i = 0; i < inserts.length; i += 500) {
        await tx.insert(schema.feriadosSnapshot).values(inserts.slice(i, i + 500));
      }
    }
    const totalFiliais = new Set(inserts.map((i) => i.filialId).filter(Boolean)).size;
    await tx.insert(schema.feriadosMeta).values({
      id: 'singleton',
      ultimaAtualizacao: new Date(),
      atualizadoPor: s.adminId,
      totalLinhas: inserts.length,
      totalFiliais,
    }).onConflictDoUpdate({
      target: schema.feriadosMeta.id,
      set: {
        ultimaAtualizacao: new Date(),
        atualizadoPor: s.adminId,
        totalLinhas: inserts.length,
        totalFiliais,
      },
    });
  });

  revalidatePath('/indicadores');
  return {
    inserted: inserts.length,
    abasProcessadas, totalLidoBruto, totalNaoPerlog,
    warnings,
  };
}

export type DadosFeriados = {
  meta: { ultimaAtualizacao: string | null; atualizadoPorNome: string | null } | null;
  resumo: ResumoFeriados;
  topFuncoes: Array<{ label: string; valor: number; pct: number }>;
  topSecoes: Array<{ label: string; valor: number; pct: number }>;
  topTipos: Array<{ label: string; valor: number; pct: number }>;
  porFilial: ResumoFilialFeriados[];
  detalhado: DetalhadoFeriadosRow[];
  filtros: { funcoes: string[]; secoes: string[] };
};

export async function getDadosFeriados(): Promise<DadosFeriados> {
  const s = await requireSession();
  const escopoRanking = getFiliaisRanking(s);
  const escopoDet     = getFiliaisVisiveis(s);

  const todos     = await fetchFeriadosRows(escopoRanking);
  const filtrados = escopoRanking === escopoDet ? todos : await fetchFeriadosRows(escopoDet);

  const metaRow = await db
    .select({ ts: schema.feriadosMeta.ultimaAtualizacao, nome: schema.admins.nome })
    .from(schema.feriadosMeta)
    .leftJoin(schema.admins, eq(schema.feriadosMeta.atualizadoPor, schema.admins.id))
    .where(eq(schema.feriadosMeta.id, 'singleton'));

  const meta = metaRow[0]
    ? { ultimaAtualizacao: metaRow[0].ts.toISOString(), atualizadoPorNome: metaRow[0].nome }
    : null;

  const detalhado = montarDetalhadoFeriados(filtrados);
  const funcoes = [...new Set(detalhado.map((d) => d.funcao).filter((x): x is string => !!x))].sort();
  const secoes  = [...new Set(detalhado.map((d) => d.secao ).filter((x): x is string => !!x))].sort();

  return {
    meta,
    resumo:     agregarResumoFeriados(filtrados),
    topFuncoes: top5PorFeriados(filtrados, 'funcao'),
    topSecoes:  top5PorFeriados(filtrados, 'secao'),
    topTipos:   top5PorFeriados(filtrados, 'pendencia'),
    porFilial:  agregarResumoPorFilialFeriados(todos),
    detalhado,
    filtros: { funcoes, secoes },
  };
}
