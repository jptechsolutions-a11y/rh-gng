'use server';

import { db } from '@/db/client';
import { and, eq, inArray } from 'drizzle-orm';
import { qlpLideres, qlpColaboradores, qlpVinculos, qlpHistorico } from '@/db/schema';
import { gravarHistorico, assertCanLead } from './_shared';
import { requireSession } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

type TierLider = 'gerente' | 'subgerente' | 'coord';
type NivelLider = 'nacional' | 'regional' | 'i' | 'ii' | null;

export async function criarLider(input: {
  colaboradorId: string;
  tier: TierLider;
  nivel: NivelLider;
  escopoNacional: boolean;
  filiaisEscopo: string[];
  liderAcimaId?: string | null;
}) {
  const s = await requireSession('admin');

  if (input.tier === 'subgerente' && input.nivel) {
    throw new Error('subgerente não tem nível (deixe em branco)');
  }
  if (input.tier !== 'subgerente' && !input.nivel) {
    throw new Error('gerente/coord precisa de nível (nacional ou regional)');
  }
  if (input.nivel && !['nacional', 'regional'].includes(input.nivel)) {
    throw new Error(
      `nível "${input.nivel}" é válido só para supervisor (i/ii); use nacional ou regional para gerente/coord`,
    );
  }
  if (!input.escopoNacional && input.filiaisEscopo.length === 0) {
    throw new Error('líder regional precisa de ao menos 1 filial no escopo');
  }

  const lider = await db.transaction(async (tx) => {
    const colab = await tx.query.qlpColaboradores.findFirst({
      where: eq(qlpColaboradores.id, input.colaboradorId),
    });
    if (!colab) throw new Error('colaborador não encontrado');

    const jaLider = await tx.query.qlpLideres.findFirst({
      where: eq(qlpLideres.colaboradorId, input.colaboradorId),
    });
    if (jaLider) throw new Error('colaborador já é líder');

    const [novo] = await tx
      .insert(qlpLideres)
      .values({
        colaboradorId: input.colaboradorId,
        tier: input.tier,
        nivel: input.nivel,
        escopoNacional: input.escopoNacional,
        filiaisEscopo: input.filiaisEscopo,
        ativo: true,
      })
      .returning();
    if (!novo) throw new Error('falha ao criar líder');

    await tx
      .update(qlpColaboradores)
      .set({
        tierResolvido: input.tier,
        nivelResolvido: input.nivel,
        updatedAt: new Date(),
      })
      .where(eq(qlpColaboradores.id, input.colaboradorId));

    await gravarHistorico(tx as unknown as typeof db, {
      evento: 'lider_criado',
      colaboradorId: input.colaboradorId,
      detalhes: { lider: novo, liderAcimaId: input.liderAcimaId ?? null },
      ator: {
        tipo: 'admin',
        id: s.adminId,
        nome: s.nome ?? s.usuario,
        filialContextoId: null,
      },
    });

    if (input.liderAcimaId) {
      const liderAcima = await tx.query.qlpLideres.findFirst({
        where: eq(qlpLideres.id, input.liderAcimaId),
      });
      if (!liderAcima) throw new Error('líder acima não encontrado');
      assertCanLead(liderAcima.tier, novo.tier);
      await tx.insert(qlpVinculos).values({
        colaboradorId: input.colaboradorId,
        liderId: input.liderAcimaId,
        origem: 'admin',
        criadoPor: s.nome ?? s.usuario,
      });
      await gravarHistorico(tx as unknown as typeof db, {
        evento: 'vinculo_criado',
        colaboradorId: input.colaboradorId,
        liderIdNovo: input.liderAcimaId,
        detalhes: { motivo: 'criação inicial do líder', origem: 'admin' },
        ator: {
          tipo: 'admin',
          id: s.adminId,
          nome: s.nome ?? s.usuario,
          filialContextoId: null,
        },
      });
    }

    return novo;
  });

  revalidatePath('/qlp/lideres');
  revalidatePath('/qlp/organograma');
  return lider;
}

export async function editarEscopoLider(input: {
  liderId: string;
  escopoNacional?: boolean;
  filiaisEscopo?: string[];
}) {
  const s = await requireSession('admin');

  await db.transaction(async (tx) => {
    const antes = await tx.query.qlpLideres.findFirst({
      where: eq(qlpLideres.id, input.liderId),
    });
    if (!antes) throw new Error('líder não encontrado');

    const escopoNacional = input.escopoNacional ?? antes.escopoNacional;
    const filiaisEscopo = input.filiaisEscopo ?? (antes.filiaisEscopo as string[]);

    if (!escopoNacional && filiaisEscopo.length === 0) {
      throw new Error('líder regional precisa de ao menos 1 filial no escopo');
    }

    await tx
      .update(qlpLideres)
      .set({ escopoNacional, filiaisEscopo })
      .where(eq(qlpLideres.id, input.liderId));

    await gravarHistorico(tx as unknown as typeof db, {
      evento: 'lider_escopo_alterado',
      detalhes: { antes, depois: { escopoNacional, filiaisEscopo } },
      ator: {
        tipo: 'admin',
        id: s.adminId,
        nome: s.nome ?? s.usuario,
        filialContextoId: null,
      },
    });
  });

  revalidatePath('/qlp/lideres');
}

export async function removerLider(liderId: string) {
  const s = await requireSession('admin');

  await db.transaction(async (tx) => {
    const antes = await tx.query.qlpLideres.findFirst({
      where: eq(qlpLideres.id, liderId),
    });
    if (!antes) throw new Error('líder não encontrado');

    await tx.delete(qlpLideres).where(eq(qlpLideres.id, liderId));

    await gravarHistorico(tx as unknown as typeof db, {
      evento: 'lider_removido',
      colaboradorId: antes.colaboradorId,
      detalhes: { antes },
      ator: {
        tipo: 'admin',
        id: s.adminId,
        nome: s.nome ?? s.usuario,
        filialContextoId: null,
      },
    });
  });

  revalidatePath('/qlp/lideres');
  revalidatePath('/qlp/organograma');
}

/**
 * Cria automaticamente registros em qlp_lideres para todo colaborador
 * cuja função foi classificada como gerente/subgerente/coord e que ainda
 * não tem registro de líder. Idempotente — pode rodar várias vezes.
 *
 * Defaults aplicados:
 *  - tier            = tier_resolvido
 *  - nivel           = nivel_resolvido
 *  - escopo_nacional = (nivel === 'nacional')
 *  - filiais_escopo  = escopo regional/subgerente → [filial_id do colaborador]; nacional → []
 *
 * Admin pode editar escopo depois via editarEscopoLider.
 */
export async function seedLideresInicial(): Promise<{ criados: number; jaExistiam: number }> {
  const s = await requireSession('admin');

  const candidatos = await db
    .select({
      id: qlpColaboradores.id,
      nome: qlpColaboradores.nome,
      tier: qlpColaboradores.tierResolvido,
      nivel: qlpColaboradores.nivelResolvido,
      filialId: qlpColaboradores.filialId,
    })
    .from(qlpColaboradores)
    .where(
      and(
        eq(qlpColaboradores.ativo, true),
        inArray(qlpColaboradores.tierResolvido, ['gerente', 'subgerente', 'coord']),
      ),
    );

  const jaLideres = await db
    .select({ colaboradorId: qlpLideres.colaboradorId })
    .from(qlpLideres);
  const jaSet = new Set(jaLideres.map((l) => l.colaboradorId));

  const novos = candidatos.filter((c) => !jaSet.has(c.id));

  if (novos.length === 0) {
    return { criados: 0, jaExistiam: jaSet.size };
  }

  type NovoLider = typeof qlpLideres.$inferInsert;
  const inserts: NovoLider[] = novos.map((c) => {
    const escopoNacional = c.nivel === 'nacional';
    const filiaisEscopo =
      !escopoNacional && c.filialId ? [c.filialId] : [];
    return {
      colaboradorId: c.id,
      tier: c.tier ?? 'coord',
      nivel: c.nivel,
      escopoNacional,
      filiaisEscopo,
      ativo: true,
    };
  });

  const CHUNK = 200;
  let criados = 0;
  for (let i = 0; i < inserts.length; i += CHUNK) {
    const batch = inserts.slice(i, i + CHUNK);
    const inseridos = await db.insert(qlpLideres).values(batch).returning({ id: qlpLideres.id });
    criados += inseridos.length;
  }

  await db.insert(qlpHistorico).values({
    evento: 'lideres_pre_preenchidos',
    detalhes: {
      criados,
      candidatos: candidatos.length,
      jaExistiam: jaSet.size,
    },
    atorTipo: 'admin',
    atorId: s.adminId,
    atorNome: s.nome ?? s.usuario,
    filialContextoId: null,
  });

  revalidatePath('/qlp/lideres');
  revalidatePath('/qlp/organograma');
  revalidatePath('/qlp');
  return { criados, jaExistiam: jaSet.size };
}
