import 'server-only';
import { sql } from 'drizzle-orm';
import { db, schema } from '@/db/client';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_TRIES = 5;

export async function checkRateLimit(chave: string): Promise<{ ok: boolean; restantes: number }> {
  const janela = new Date(Math.floor(Date.now() / WINDOW_MS) * WINDOW_MS);

  const [row] = await db
    .insert(schema.rateLimits)
    .values({ chave, janelaIni: janela, contagem: 1 })
    .onConflictDoUpdate({
      target: [schema.rateLimits.chave, schema.rateLimits.janelaIni],
      set: { contagem: sql`${schema.rateLimits.contagem} + 1` },
    })
    .returning({ contagem: schema.rateLimits.contagem });

  const c = row?.contagem ?? 1;
  return { ok: c <= MAX_TRIES, restantes: Math.max(0, MAX_TRIES - c) };
}
