'use server';

import { db, schema } from '@/db/client';
import { eq, inArray, sql } from 'drizzle-orm';
import * as XLSX from 'xlsx';
import { requireSession, getFiliaisVisiveis, getFiliaisRanking } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';
import { parseBHWorkbook } from '@/lib/indicadores/bh-parser';
import {
  agregarResumo, top5Por, agregarResumoPorFilial, montarDetalhado,
  type Resumo, type ResumoFilial, type DetalhadoRow,
} from '@/lib/indicadores/bh-queries';
import { fetchSnapshotRows } from '@/lib/indicadores/bh-db';

export type ImportarBHResult = {
  inserted: number;
  warnings: Array<{ linha?: number; chapa?: string; motivo: string }>;
};

export async function importarBH(formData: FormData): Promise<ImportarBHResult> {
  const s = await requireSession('admin');
  const file = formData.get('arquivo');
  if (!(file instanceof File)) throw new Error('Arquivo ausente');
  const buf = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buf, { type: 'buffer' });
  const { rows, warnings } = parseBHWorkbook(wb);

  const codigos = [...new Set(rows.map((r) => r.codfilial))];
  const filiaisDb = codigos.length
    ? await db.select({ id: schema.filiais.id, codigo: schema.filiais.codigo })
        .from(schema.filiais)
        .where(inArray(schema.filiais.codigo, codigos))
    : [];
  const mapFilial = new Map(filiaisDb.map((f) => [f.codigo, f.id]));

  const allWarnings: ImportarBHResult['warnings'] = warnings.slice();
  const inserts = rows.map((r) => {
    const fid = mapFilial.get(r.codfilial) ?? null;
    if (!fid) allWarnings.push({ chapa: r.chapa, motivo: `Filial ${r.codfilial} não cadastrada` });
    return {
      filialId: fid,
      codfilialOrigem: r.codfilial,
      chapa: r.chapa,
      nome: r.nome,
      funcao: r.funcao,
      secao: r.secao,
      regional: r.regional,
      bandeira: r.bandeira,
      horasDecimal: r.horasDecimal.toFixed(2),
      valorPgto: r.valorPgto.toFixed(2),
      situacao: r.situacao,
    };
  });

  await db.transaction(async (tx) => {
    await tx.execute(sql`TRUNCATE TABLE ${schema.bhSnapshotAnterior}`);
    await tx.execute(sql`INSERT INTO ${schema.bhSnapshotAnterior}
      SELECT * FROM ${schema.bhSnapshotAtual}`);
    await tx.execute(sql`TRUNCATE TABLE ${schema.bhSnapshotAtual}`);
    if (inserts.length) {
      for (let i = 0; i < inserts.length; i += 500) {
        await tx.insert(schema.bhSnapshotAtual).values(inserts.slice(i, i + 500));
      }
    }
    const totalFiliais = new Set(inserts.map((i) => i.filialId).filter(Boolean)).size;
    await tx.insert(schema.bhMeta).values({
      id: 'singleton',
      ultimaAtualizacao: new Date(),
      atualizadoPor: s.adminId,
      totalLinhas: inserts.length,
      totalFiliais,
    }).onConflictDoUpdate({
      target: schema.bhMeta.id,
      set: {
        ultimaAtualizacao: new Date(),
        atualizadoPor: s.adminId,
        totalLinhas: inserts.length,
        totalFiliais,
      },
    });
  });

  revalidatePath('/indicadores');
  return { inserted: inserts.length, warnings: allWarnings };
}

export type DadosBH = {
  meta: { ultimaAtualizacao: string | null; atualizadoPorNome: string | null } | null;
  resumo: Resumo;
  topFuncoes: Array<{ label: string; valor: number; valorPgto: number }>;
  topSecoes: Array<{ label: string; valor: number; valorPgto: number }>;
  porFilial: ResumoFilial[];
  detalhado: DetalhadoRow[];
  filtros: { funcoes: string[]; secoes: string[] };
};

export async function getDadosBH(): Promise<DadosBH> {
  const s = await requireSession();
  // Ranking cross-filial: filial vê todos para comparar; visualizador 'lista' vê só seu recorte.
  const escopoRanking = getFiliaisRanking(s);
  // Detalhamento (cards, tabela própria): restrito ao recorte do usuário.
  const escopoDet = getFiliaisVisiveis(s);

  const atualGlobal    = await fetchSnapshotRows(schema.bhSnapshotAtual, escopoRanking);
  const anteriorGlobal = await fetchSnapshotRows(schema.bhSnapshotAnterior, escopoRanking);

  const mesmoEscopo = escopoRanking === escopoDet;
  const atualDet    = mesmoEscopo ? atualGlobal    : await fetchSnapshotRows(schema.bhSnapshotAtual, escopoDet);
  const anteriorDet = mesmoEscopo ? anteriorGlobal : await fetchSnapshotRows(schema.bhSnapshotAnterior, escopoDet);

  const metaRow = await db
    .select({ ts: schema.bhMeta.ultimaAtualizacao, nome: schema.admins.nome })
    .from(schema.bhMeta)
    .leftJoin(schema.admins, eq(schema.bhMeta.atualizadoPor, schema.admins.id))
    .where(eq(schema.bhMeta.id, 'singleton'));

  const meta = metaRow[0]
    ? { ultimaAtualizacao: metaRow[0].ts.toISOString(), atualizadoPorNome: metaRow[0].nome }
    : null;

  const detalhado = montarDetalhado(atualDet, anteriorDet);
  const funcoes = [...new Set(detalhado.map((d) => d.funcao).filter((x): x is string => !!x))].sort();
  const secoes  = [...new Set(detalhado.map((d) => d.secao ).filter((x): x is string => !!x))].sort();

  return {
    meta,
    resumo: agregarResumo(atualDet),
    topFuncoes: top5Por(atualDet, 'funcao'),
    topSecoes:  top5Por(atualDet, 'secao'),
    porFilial:  agregarResumoPorFilial(atualGlobal, anteriorGlobal),
    detalhado,
    filtros: { funcoes, secoes },
  };
}
