'use server';

import { requireSession } from '@/lib/auth/session';
import { db, schema } from '@/db/client';
import { fetchSnapshotRows } from '@/lib/indicadores/bh-db';
import { fetchInconsistRows } from '@/lib/indicadores/inconsist-db';

export type RankingItem = {
  filialCodigo: string | null;
  filialNome: string | null;
  valor: number;
};

export type RankingsBundle = {
  bh: { items: RankingItem[]; totalFiliais: number };
  inconsist: { items: RankingItem[]; totalFiliais: number };
  meta: {
    bh:        { ultimaAtualizacao: string | null } | null;
    inconsist: { ultimaAtualizacao: string | null } | null;
  };
};

export async function getRankings(): Promise<RankingsBundle> {
  await requireSession();

  const bhRows = await fetchSnapshotRows(schema.bhSnapshotAtual);
  const incRows = await fetchInconsistRows();

  // BH: total de horas por filial (top 10)
  const bhMap = new Map<string, { nome: string | null; codigo: string | null; total: number }>();
  for (const r of bhRows) {
    const key = r.filialId ?? `__sem__:${r.filialCodigo ?? ''}`;
    const cur = bhMap.get(key) ?? { nome: r.filialNome, codigo: r.filialCodigo, total: 0 };
    cur.total += r.horasDecimal;
    bhMap.set(key, cur);
  }
  const bhItems: RankingItem[] = [...bhMap.values()]
    .map((v) => ({
      filialCodigo: v.codigo,
      filialNome:   v.nome,
      valor: Math.round(v.total * 100) / 100,
    }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 10);

  // Inconsistências: média por pessoa por filial (top 10)
  const incMap = new Map<string, { nome: string | null; codigo: string | null; qtd: number; chapas: Set<string> }>();
  for (const r of incRows) {
    const key = r.filialId ?? `__sem__:${r.filialCodigo ?? r.codfilialOrigem ?? ''}`;
    const cur = incMap.get(key) ?? {
      nome: r.filialNome,
      codigo: r.filialCodigo ?? r.codfilialOrigem,
      qtd: 0,
      chapas: new Set<string>(),
    };
    cur.qtd += 1;
    cur.chapas.add(r.chapa);
    incMap.set(key, cur);
  }
  const incItems: RankingItem[] = [...incMap.values()]
    .map((v) => ({
      filialCodigo: v.codigo,
      filialNome:   v.nome,
      valor: v.qtd,
    }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 10);

  const bhMetaRow = await db.select({ ts: schema.bhMeta.ultimaAtualizacao })
    .from(schema.bhMeta).limit(1);
  const incMetaRow = await db.select({ ts: schema.inconsistMeta.ultimaAtualizacao })
    .from(schema.inconsistMeta).limit(1);

  return {
    bh:        { items: bhItems,  totalFiliais: bhMap.size },
    inconsist: { items: incItems, totalFiliais: incMap.size },
    meta: {
      bh:        bhMetaRow[0]  ? { ultimaAtualizacao: bhMetaRow[0].ts.toISOString() }  : null,
      inconsist: incMetaRow[0] ? { ultimaAtualizacao: incMetaRow[0].ts.toISOString() } : null,
    },
  };
}
