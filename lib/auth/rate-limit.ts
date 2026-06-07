import 'server-only';
import { lt, sql } from 'drizzle-orm';
import { db, schema } from '@/db/client';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_TRIES = 5;

export async function checkRateLimit(
  chave: string,
  max = MAX_TRIES,
  windowMs = WINDOW_MS,
): Promise<{ ok: boolean; restantes: number }> {
  const janela = new Date(Math.floor(Date.now() / windowMs) * windowMs);

  // Cleanup oportunista (1% das chamadas): remove janelas com >1h.
  if (Math.random() < 0.01) {
    const cutoff = new Date(Date.now() - 60 * 60 * 1000);
    await db.delete(schema.rateLimits).where(lt(schema.rateLimits.janelaIni, cutoff)).catch(() => {});
  }

  const [row] = await db
    .insert(schema.rateLimits)
    .values({ chave, janelaIni: janela, contagem: 1 })
    .onConflictDoUpdate({
      target: [schema.rateLimits.chave, schema.rateLimits.janelaIni],
      set: { contagem: sql`${schema.rateLimits.contagem} + 1` },
    })
    .returning({ contagem: schema.rateLimits.contagem });

  const c = row?.contagem ?? 1;
  return { ok: c <= max, restantes: Math.max(0, max - c) };
}
