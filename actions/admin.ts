'use server';

import { count, eq, gte, sql } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import { requireSession } from '@/lib/auth/session';
import { hashPassword } from '@/lib/auth/password';

export async function dashboardStats() {
  await requireSession('admin');

  const seteDias = new Date(Date.now() - 7 * 24 * 3600 * 1000);

  const totalRow = await db.select({ n: count() }).from(schema.entrevistas);
  const semanaRow = await db.select({ n: count() })
    .from(schema.entrevistas)
    .where(gte(schema.entrevistas.dataHora, seteDias));

  const porStatus = await db.select({
    status: schema.entrevistas.status,
    n: count(),
  }).from(schema.entrevistas).groupBy(schema.entrevistas.status);

  const porFilial = await db.execute<{ codigo: string; nome: string; n: number }>(sql`
    select f.codigo, f.nome, count(e.id)::int as n
    from filiais f
    left join entrevistas e on e.filial_id = f.id
    group by f.id, f.codigo, f.nome
    order by f.codigo
  `);

  return {
    total: Number(totalRow[0]?.n ?? 0),
    semana: Number(semanaRow[0]?.n ?? 0),
    porStatus,
    porFilial: porFilial as unknown as Array<{ codigo: string; nome: string; n: number }>,
  };
}

export async function trocarSenhaFilial(filialCodigo: string, novaSenha: string) {
  await requireSession('admin');
  if (novaSenha.length < 6) throw new Error('Senha mínima de 6 caracteres');
  const hash = await hashPassword(novaSenha);
  await db.update(schema.filiais).set({ senhaHash: hash }).where(eq(schema.filiais.codigo, filialCodigo));
  return { ok: true };
}
