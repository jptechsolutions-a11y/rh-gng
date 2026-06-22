'use server';

import { db } from '@/db/client';
import { eq } from 'drizzle-orm';
import { qlpFuncoesCargo, qlpColaboradores } from '@/db/schema';
import { autoclassify } from '@/lib/qlp/autoclassify';
import { gravarHistorico } from './_shared';
import { requireSession } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

export async function reclassificarFuncao(input: {
  funcao: string;
  tier: string;
  nivel: string | null;
  trilha: string | null;
}) {
  const s = await requireSession('admin');

  await db.transaction(async (tx) => {
    const antes = await tx.query.qlpFuncoesCargo.findFirst({
      where: eq(qlpFuncoesCargo.funcao, input.funcao),
    });

    if (antes) {
      await tx
        .update(qlpFuncoesCargo)
        .set({
          tier: input.tier,
          nivel: input.nivel,
          trilha: input.trilha,
          confirmadaPorAdmin: true,
        })
        .where(eq(qlpFuncoesCargo.funcao, input.funcao));
    } else {
      await tx.insert(qlpFuncoesCargo).values({
        funcao: input.funcao,
        tier: input.tier,
        nivel: input.nivel,
        trilha: input.trilha,
        confirmadaPorAdmin: true,
      });
    }

    await tx
      .update(qlpColaboradores)
      .set({
        tierResolvido: input.tier,
        nivelResolvido: input.nivel,
        trilhaResolvida: input.trilha,
        updatedAt: new Date(),
      })
      .where(eq(qlpColaboradores.funcao, input.funcao));

    await gravarHistorico(tx as unknown as typeof db, {
      evento: 'funcao_reclassificada',
      detalhes: { funcao: input.funcao, antes, depois: input },
      ator: {
        tipo: 'admin',
        id: s.adminId,
        nome: s.nome ?? s.usuario,
        filialContextoId: null,
      },
    });
  });

  revalidatePath('/qlp/cargos');
  revalidatePath('/qlp/quadro');
}

export async function classificarSeNova(funcao: string) {
  const exists = await db.query.qlpFuncoesCargo.findFirst({
    where: eq(qlpFuncoesCargo.funcao, funcao),
  });
  if (exists) return exists;
  const c = autoclassify(funcao);
  const [row] = await db
    .insert(qlpFuncoesCargo)
    .values({ funcao, tier: c.tier, nivel: c.nivel, trilha: c.trilha })
    .returning();
  return row;
}
