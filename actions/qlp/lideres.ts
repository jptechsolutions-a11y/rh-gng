'use server';

import { db } from '@/db/client';
import { and, eq } from 'drizzle-orm';
import { qlpLideres, qlpColaboradores, qlpVinculos, filiais } from '@/db/schema';
import { gravarHistorico, assertCanLead } from './_shared';
import { requireSession } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

type TierLider = 'gerente' | 'subgerente' | 'coord' | 'supervisor' | 'encarregado';
type NivelLider = 'nacional' | 'regional' | 'multi' | 'filial' | 'i' | 'ii' | null;

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
  if ((input.tier === 'gerente' || input.tier === 'coord') && !input.nivel) {
    throw new Error('gerente/coord precisa de nível (nacional, regional, multi ou filial)');
  }
  if (input.nivel && !['nacional', 'regional', 'multi', 'filial', 'i', 'ii'].includes(input.nivel)) {
    throw new Error(
      `nível "${input.nivel}" é inválido; use nacional, regional, multi, filial, i ou ii`,
    );
  }
  if (!input.escopoNacional && input.filiaisEscopo.length === 0) {
    throw new Error('líder regional/multi/filial precisa de ao menos 1 filial no escopo');
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
  nivel?: NivelLider;
}) {
  const s = await requireSession('admin');

  await db.transaction(async (tx) => {
    const antes = await tx.query.qlpLideres.findFirst({
      where: eq(qlpLideres.id, input.liderId),
    });
    if (!antes) throw new Error('líder não encontrado');

    const colabId = antes.colaboradorId;
    const escopoNacional = input.escopoNacional ?? antes.escopoNacional;
    const filiaisEscopo = input.filiaisEscopo ?? (antes.filiaisEscopo as string[]);

    if (!escopoNacional && filiaisEscopo.length === 0) {
      throw new Error('líder regional precisa de ao menos 1 filial no escopo');
    }

    let nivel = input.nivel;
    if (nivel === undefined) {
      nivel = null;
      if (antes.tier !== 'subgerente') {
        if (escopoNacional) {
          nivel = 'nacional';
        } else {
          const colab = await tx.query.qlpColaboradores.findFirst({
            where: eq(qlpColaboradores.id, colabId),
          });
          const colaboradorFilialId = colab?.filialId ?? null;

          if (
            filiaisEscopo.length === 1 &&
            colaboradorFilialId &&
            filiaisEscopo[0] === colaboradorFilialId
          ) {
            nivel = 'filial';
          } else {
            // Busca filiais ativas do banco para bater a regional
            const listaFiliaisDb = await tx.query.filiais.findMany({
              where: eq(filiais.ativa, true),
            });
            const filialRegional = new Map<string, string | null>();
            for (const f of listaFiliaisDb) filialRegional.set(f.id, f.regional);

            const regsUnicas = Array.from(new Set(
              filiaisEscopo.map((id) => filialRegional.get(id)).filter((r): r is string => r != null)
            ));

            let eRegional = false;
            if (regsUnicas.length > 0) {
              const filiaisDasRegionais = listaFiliaisDb.filter((f) => f.regional && regsUnicas.includes(f.regional)).map((f) => f.id);
              eRegional = filiaisDasRegionais.every((id) => filiaisEscopo.includes(id)) &&
                          filiaisDasRegionais.length === filiaisEscopo.length;
            }

            if (eRegional) {
              nivel = 'regional';
            } else {
              nivel = 'multi';
            }
          }
        }
      }
    }

    await tx
      .update(qlpLideres)
      .set({ escopoNacional, filiaisEscopo, nivel })
      .where(eq(qlpLideres.id, input.liderId));

    if (nivel) {
      await tx
        .update(qlpColaboradores)
        .set({ nivelResolvido: nivel, updatedAt: new Date() })
        .where(eq(qlpColaboradores.id, colabId));
    }

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

