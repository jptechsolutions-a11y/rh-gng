'use server';

import { db, schema } from '@/db/client';
import { eq, inArray, sql } from 'drizzle-orm';
import * as XLSX from 'xlsx';
import { requireSession, getFiliaisVisiveis, getFiliaisRanking } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';
import { parseCursosWorkbook } from '@/lib/indicadores/cursos-parser';
import {
  agregarResumoCursos, top5PorCursos,
  agregarResumoPorFilialCursos, montarDetalhadoCursos,
  type ResumoCursos, type ResumoFilialCursos, type DetalhadoCursosRow,
} from '@/lib/indicadores/cursos-queries';
import { fetchCursosRows } from '@/lib/indicadores/cursos-db';

export type ImportarCursosResult = {
  inserted: number;
  warnings: Array<{ linha?: number; chapa?: string; motivo: string }>;
};

export async function importarCursos(formData: FormData): Promise<ImportarCursosResult> {
  const s = await requireSession('admin');
  const file = formData.get('arquivo');
  if (!(file instanceof File)) throw new Error('Arquivo ausente');
  const buf = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buf, { type: 'buffer' });
  const { rows, warnings } = parseCursosWorkbook(wb);

  const codigos = [...new Set(rows.map((r) => r.codfilial))];
  const filiaisDb = codigos.length
    ? await db.select({ id: schema.filiais.id, codigo: schema.filiais.codigo })
        .from(schema.filiais)
        .where(inArray(schema.filiais.codigo, codigos))
    : [];
  const mapFilial = new Map(filiaisDb.map((f) => [f.codigo, f.id]));

  const allWarnings: ImportarCursosResult['warnings'] = warnings.slice();
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
      codsituacao: r.codsituacao,
      tipo: r.tipo,
      dataTreinamento: r.dataTreinamento,
      contagem: r.contagem,
      pendencia: r.pendencia,
      bpNacional: r.bpNacional,
      bpRegional: r.bpRegional,
    };
  });

  await db.transaction(async (tx) => {
    // Copia atual → anterior antes de truncar atual.
    await tx.execute(sql`TRUNCATE TABLE ${schema.cursosSnapshotAnterior}`);
    await tx.execute(sql`INSERT INTO ${schema.cursosSnapshotAnterior}
      SELECT * FROM ${schema.cursosSnapshotAtual}`);
    await tx.execute(sql`TRUNCATE TABLE ${schema.cursosSnapshotAtual}`);
    if (inserts.length) {
      for (let i = 0; i < inserts.length; i += 500) {
        await tx.insert(schema.cursosSnapshotAtual).values(inserts.slice(i, i + 500));
      }
    }
    const totalFiliais = new Set(inserts.map((i) => i.filialId).filter(Boolean)).size;
    await tx.insert(schema.cursosMeta).values({
      id: 'singleton',
      ultimaAtualizacao: new Date(),
      atualizadoPor: s.adminId,
      totalLinhas: inserts.length,
      totalFiliais,
    }).onConflictDoUpdate({
      target: schema.cursosMeta.id,
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

export type DadosCursos = {
  meta: { ultimaAtualizacao: string | null; atualizadoPorNome: string | null } | null;
  resumo: ResumoCursos;
  resumoAnterior: ResumoCursos;
  topFuncoes: Array<{ label: string; valor: number; pct: number }>;
  topSecoes: Array<{ label: string; valor: number; pct: number }>;
  topTipos: Array<{ label: string; valor: number; pct: number }>;
  porFilial: ResumoFilialCursos[];
  detalhado: DetalhadoCursosRow[];
  filtros: { funcoes: string[]; secoes: string[] };
};

export async function getDadosCursos(): Promise<DadosCursos> {
  const s = await requireSession();
  const escopoRanking = getFiliaisRanking(s);
  const escopoDet     = getFiliaisVisiveis(s);

  const atualGlobal    = await fetchCursosRows(schema.cursosSnapshotAtual, escopoRanking);
  const anteriorGlobal = await fetchCursosRows(schema.cursosSnapshotAnterior, escopoRanking);

  const mesmoEscopo = escopoRanking === escopoDet;
  const atualDet    = mesmoEscopo ? atualGlobal    : await fetchCursosRows(schema.cursosSnapshotAtual, escopoDet);
  const anteriorDet = mesmoEscopo ? anteriorGlobal : await fetchCursosRows(schema.cursosSnapshotAnterior, escopoDet);

  const metaRow = await db
    .select({ ts: schema.cursosMeta.ultimaAtualizacao, nome: schema.admins.nome })
    .from(schema.cursosMeta)
    .leftJoin(schema.admins, eq(schema.cursosMeta.atualizadoPor, schema.admins.id))
    .where(eq(schema.cursosMeta.id, 'singleton'));

  const meta = metaRow[0]
    ? { ultimaAtualizacao: metaRow[0].ts.toISOString(), atualizadoPorNome: metaRow[0].nome }
    : null;

  const detalhado = montarDetalhadoCursos(atualDet, anteriorDet);
  const funcoes = [...new Set(detalhado.map((d) => d.funcao).filter((x): x is string => !!x))].sort();
  const secoes  = [...new Set(detalhado.map((d) => d.secao ).filter((x): x is string => !!x))].sort();

  return {
    meta,
    resumo:         agregarResumoCursos(atualDet),
    resumoAnterior: agregarResumoCursos(anteriorDet),
    topFuncoes:     top5PorCursos(atualDet, 'funcao'),
    topSecoes:      top5PorCursos(atualDet, 'secao'),
    topTipos:       top5PorCursos(atualDet, 'tipo'),
    porFilial:      agregarResumoPorFilialCursos(atualGlobal, anteriorGlobal),
    detalhado,
    filtros: { funcoes, secoes },
  };
}
