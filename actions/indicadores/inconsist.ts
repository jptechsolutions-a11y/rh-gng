'use server';

import { db, schema } from '@/db/client';
import { eq, inArray, sql } from 'drizzle-orm';
import * as XLSX from 'xlsx';
import { requireSession } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';
import { parseInconsistWorkbook } from '@/lib/indicadores/inconsist-parser';
import {
  agregarResumoInconsist, top5PorInconsist,
  agregarResumoPorFilialInconsist, montarDetalhadoInconsist,
  type ResumoInconsist, type ResumoFilialInconsist, type DetalhadoInconsistRow,
} from '@/lib/indicadores/inconsist-queries';
import { fetchInconsistRows } from '@/lib/indicadores/inconsist-db';

export type ImportarInconsistResult = {
  inserted: number;
  warnings: Array<{ linha?: number; chapa?: string; motivo: string }>;
};

export async function importarInconsist(formData: FormData): Promise<ImportarInconsistResult> {
  const s = await requireSession('admin');
  const file = formData.get('arquivo');
  if (!(file instanceof File)) throw new Error('Arquivo ausente');
  const buf = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buf, { type: 'buffer' });
  const { rows, warnings } = parseInconsistWorkbook(wb);

  const codigos = [...new Set(rows.map((r) => r.codfilial))];
  const filiaisDb = codigos.length
    ? await db.select({ id: schema.filiais.id, codigo: schema.filiais.codigo })
        .from(schema.filiais)
        .where(inArray(schema.filiais.codigo, codigos))
    : [];
  const mapFilial = new Map(filiaisDb.map((f) => [f.codigo, f.id]));

  const allWarnings: ImportarInconsistResult['warnings'] = warnings.slice();
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
      tipo: r.tipo,
      dataOcorrencia: r.dataOcorrencia,
      codsituacao: r.codsituacao,
    };
  });

  await db.transaction(async (tx) => {
    await tx.execute(sql`TRUNCATE TABLE ${schema.inconsistSnapshot}`);
    if (inserts.length) {
      for (let i = 0; i < inserts.length; i += 500) {
        await tx.insert(schema.inconsistSnapshot).values(inserts.slice(i, i + 500));
      }
    }
    const totalFiliais = new Set(inserts.map((i) => i.filialId).filter(Boolean)).size;
    await tx.insert(schema.inconsistMeta).values({
      id: 'singleton',
      ultimaAtualizacao: new Date(),
      atualizadoPor: s.adminId,
      totalLinhas: inserts.length,
      totalFiliais,
    }).onConflictDoUpdate({
      target: schema.inconsistMeta.id,
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

export type DadosInconsist = {
  meta: { ultimaAtualizacao: string | null; atualizadoPorNome: string | null } | null;
  resumo: ResumoInconsist;
  topFuncoes: Array<{ label: string; valor: number; pct: number }>;
  topSecoes: Array<{ label: string; valor: number; pct: number }>;
  porFilial: ResumoFilialInconsist[];
  detalhado: DetalhadoInconsistRow[];
  filtros: { funcoes: string[]; secoes: string[] };
};

export async function getDadosInconsist(): Promise<DadosInconsist> {
  const s = await requireSession();
  const isAdmin = s.perfil === 'admin';
  const filialFiltro = isAdmin ? undefined : s.filialId;

  const todos = await fetchInconsistRows();
  const filtrados = filialFiltro
    ? await fetchInconsistRows(filialFiltro)
    : todos;

  const metaRow = await db
    .select({ ts: schema.inconsistMeta.ultimaAtualizacao, nome: schema.admins.nome })
    .from(schema.inconsistMeta)
    .leftJoin(schema.admins, eq(schema.inconsistMeta.atualizadoPor, schema.admins.id))
    .where(eq(schema.inconsistMeta.id, 'singleton'));

  const meta = metaRow[0]
    ? { ultimaAtualizacao: metaRow[0].ts.toISOString(), atualizadoPorNome: metaRow[0].nome }
    : null;

  const detalhado = montarDetalhadoInconsist(filtrados);
  const funcoes = [...new Set(detalhado.map((d) => d.funcao).filter((x): x is string => !!x))].sort();
  const secoes  = [...new Set(detalhado.map((d) => d.secao ).filter((x): x is string => !!x))].sort();

  return {
    meta,
    resumo:     agregarResumoInconsist(filtrados),
    topFuncoes: top5PorInconsist(filtrados, 'funcao'),
    topSecoes:  top5PorInconsist(filtrados, 'secao'),
    porFilial:  agregarResumoPorFilialInconsist(todos),
    detalhado,
    filtros: { funcoes, secoes },
  };
}
