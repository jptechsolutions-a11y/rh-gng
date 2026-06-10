import 'server-only';
import { db, schema } from '@/db/client';
import { asc, eq } from 'drizzle-orm';
import { ROTEIRO_FALLBACK } from './roteiro-fallback';
import { PILARES_FALLBACK } from './pilares-fallback';

export async function carregarRoteiro() {
  const [row] = await db.select().from(schema.escutaRoteiro)
    .where(eq(schema.escutaRoteiro.id, 1)).limit(1);
  if (!row) return ROTEIRO_FALLBACK;
  return {
    heroTitulo:    row.heroTitulo,
    heroSubtitulo: row.heroSubtitulo,
    heroFrase:     row.heroFrase,
    bannerTexto:   row.bannerTexto,
    etapas:        row.etapas ?? [],
    diasSugeridos: row.diasSugeridos ?? [],
  };
}

export async function carregarPilares() {
  const rows = await db.select().from(schema.escutaPilares)
    .orderBy(asc(schema.escutaPilares.ordem));
  if (rows.length === 0) return PILARES_FALLBACK;
  return rows.map((r) => ({
    id: r.id, ordem: r.ordem, nome: r.nome, icone: r.icone,
    perguntas: r.perguntas ?? [],
  }));
}
