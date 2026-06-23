'use server';

import { db } from '@/db/client';
import { eq } from 'drizzle-orm';
import { qlpVinculos, qlpLideres, qlpColaboradores } from '@/db/schema';
import {
  assertCanLead,
  escopoCobreFilial,
  gravarHistorico,
  type AtorContexto,
} from './_shared';
import { getSession } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

async function resolverAtor(filialAlvoId: string | null): Promise<AtorContexto> {
  const s = await getSession();
  if (!s) throw new Error('não autenticado');
  if (s.perfil === 'admin') {
    return {
      tipo: 'admin',
      id: s.adminId,
      nome: s.nome ?? s.usuario,
      filialContextoId: filialAlvoId,
    };
  }
  if (s.perfil === 'filial') {
    if (filialAlvoId && filialAlvoId !== s.filialId) {
      throw new Error('filial só opera colaboradores da própria filial');
    }
    return {
      tipo: 'filial',
      id: s.filialId,
      nome: s.filialNome,
      filialContextoId: s.filialId,
    };
  }
  throw new Error('perfil não autorizado para esta ação');
}

export async function atribuirVinculo(input: {
  colaboradorId: string;
  liderId: string;
  motivo: string;
}) {
  if (!input.motivo?.trim()) throw new Error('motivo obrigatório');

  await db.transaction(async (tx) => {
    const colab = await tx.query.qlpColaboradores.findFirst({
      where: eq(qlpColaboradores.id, input.colaboradorId),
    });
    if (!colab) throw new Error('colaborador inexistente');

    const lider = await tx.query.qlpLideres.findFirst({
      where: eq(qlpLideres.id, input.liderId),
    });
    if (!lider) throw new Error('líder inexistente');

    const ator = await resolverAtor(colab.filialId);

    if (ator.tipo === 'filial') {
      const tierColab = colab.tierResolvido ?? 'base';
      const isBaseSup = tierColab === 'base' && (lider.tier === 'supervisor' || lider.tier === 'encarregado');
      const isSupCoord = (tierColab === 'supervisor' || tierColab === 'encarregado') && lider.tier === 'coord';
      if (!isBaseSup && !isSupCoord) {
        throw new Error('filial só pode amarrar base↔supervisor/encarregado ou supervisor/encarregado↔coord');
      }
    }

    assertCanLead(lider.tier, colab.tierResolvido ?? 'base', {
      liderNivel: lider.nivel,
      lideradoNivel: colab.nivelResolvido,
    });

    if (!colab.filialId) throw new Error('colaborador sem filial associada');
    const cobre = escopoCobreFilial(
      {
        escopoNacional: lider.escopoNacional,
        filiaisEscopo: lider.filiaisEscopo as string[],
      },
      colab.filialId,
    );
    if (!cobre) {
      throw new Error('líder não cobre a filial do colaborador');
    }

    const antigo = await tx.query.qlpVinculos.findFirst({
      where: eq(qlpVinculos.colaboradorId, input.colaboradorId),
    });

    const origem = ator.tipo === 'admin' ? 'admin' : 'filial';
    if (antigo) {
      await tx
        .update(qlpVinculos)
        .set({
          liderId: input.liderId,
          origem,
          criadoPor: ator.nome,
          createdAt: new Date(),
        })
        .where(eq(qlpVinculos.colaboradorId, input.colaboradorId));
    } else {
      await tx.insert(qlpVinculos).values({
        colaboradorId: input.colaboradorId,
        liderId: input.liderId,
        origem,
        criadoPor: ator.nome,
      });
    }

    await gravarHistorico(tx as unknown as typeof db, {
      evento: antigo ? 'vinculo_movido' : 'vinculo_criado',
      colaboradorId: input.colaboradorId,
      liderIdAntigo: antigo?.liderId ?? null,
      liderIdNovo: input.liderId,
      detalhes: { motivo: input.motivo, origem },
      ator,
    });
  });

  revalidatePath('/qlp/quadro');
  revalidatePath('/qlp/organograma');
  revalidatePath(`/qlp/${input.colaboradorId}`);
}

export async function removerVinculo(colaboradorId: string, motivo: string) {
  if (!motivo?.trim()) throw new Error('motivo obrigatório');

  await db.transaction(async (tx) => {
    const colab = await tx.query.qlpColaboradores.findFirst({
      where: eq(qlpColaboradores.id, colaboradorId),
    });
    if (!colab) throw new Error('colaborador inexistente');

    const ator = await resolverAtor(colab.filialId);
    const antes = await tx.query.qlpVinculos.findFirst({
      where: eq(qlpVinculos.colaboradorId, colaboradorId),
    });
    if (!antes) return;

    await tx.delete(qlpVinculos).where(eq(qlpVinculos.colaboradorId, colaboradorId));

    await gravarHistorico(tx as unknown as typeof db, {
      evento: 'vinculo_removido',
      colaboradorId,
      liderIdAntigo: antes.liderId,
      detalhes: { motivo },
      ator,
    });
  });

  revalidatePath('/qlp/quadro');
  revalidatePath(`/qlp/${colaboradorId}`);
}

export async function moverColaborador(input: {
  colaboradorId: string;
  novoLiderId: string;
  motivo: string;
}) {
  return atribuirVinculo({
    colaboradorId: input.colaboradorId,
    liderId: input.novoLiderId,
    motivo: input.motivo,
  });
}

/**
 * Transfere TODOS os vínculos do `liderOrigemId` para o `liderDestinoId`.
 * Pula colaboradores que violem hierarquia/escopo do destino e os retorna
 * em `ignorados` para o admin decidir o que fazer com eles depois.
 */
export async function transferirTime(input: {
  liderOrigemId: string;
  liderDestinoId: string;
  motivo: string;
}): Promise<{ transferidos: number; ignorados: { nome: string; motivo: string }[] }> {
  if (!input.motivo?.trim()) throw new Error('motivo obrigatório');
  if (input.liderOrigemId === input.liderDestinoId) {
    throw new Error('líder de destino é igual ao de origem');
  }

  const ignorados: { nome: string; motivo: string }[] = [];
  let transferidos = 0;

  await db.transaction(async (tx) => {
    const destino = await tx.query.qlpLideres.findFirst({
      where: eq(qlpLideres.id, input.liderDestinoId),
    });
    if (!destino) throw new Error('líder de destino inexistente');
    if (!destino.ativo) throw new Error('líder de destino está inativo');

    const origem = await tx.query.qlpLideres.findFirst({
      where: eq(qlpLideres.id, input.liderOrigemId),
    });
    if (!origem) throw new Error('líder de origem inexistente');

    const vinculos = await tx.query.qlpVinculos.findMany({
      where: eq(qlpVinculos.liderId, input.liderOrigemId),
    });

    for (const v of vinculos) {
      const colab = await tx.query.qlpColaboradores.findFirst({
        where: eq(qlpColaboradores.id, v.colaboradorId),
      });
      if (!colab) continue;

      const ator = await resolverAtor(colab.filialId);

      try {
        if (ator.tipo === 'filial') {
          const tierColab = colab.tierResolvido ?? 'base';
          const isBaseSup = tierColab === 'base' && (destino.tier === 'supervisor' || destino.tier === 'encarregado');
          const isSupCoord = (tierColab === 'supervisor' || tierColab === 'encarregado') && destino.tier === 'coord';
          if (!isBaseSup && !isSupCoord) {
            throw new Error('filial só pode amarrar base↔supervisor/encarregado ou supervisor/encarregado↔coord');
          }
        }

        assertCanLead(destino.tier, colab.tierResolvido ?? 'base', {
          liderNivel: destino.nivel,
          lideradoNivel: colab.nivelResolvido,
        });

        if (!colab.filialId) throw new Error('colaborador sem filial associada');
        const cobre = escopoCobreFilial(
          {
            escopoNacional: destino.escopoNacional,
            filiaisEscopo: destino.filiaisEscopo as string[],
          },
          colab.filialId,
        );
        if (!cobre) throw new Error('líder de destino não cobre a filial do colaborador');
      } catch (e) {
        ignorados.push({
          nome: colab.nome,
          motivo: e instanceof Error ? e.message : 'erro de validação',
        });
        continue;
      }

      const origemTipo = ator.tipo === 'admin' ? 'admin' : 'filial';

      await tx
        .update(qlpVinculos)
        .set({
          liderId: input.liderDestinoId,
          origem: origemTipo,
          criadoPor: ator.nome,
          createdAt: new Date(),
        })
        .where(eq(qlpVinculos.colaboradorId, v.colaboradorId));

      await gravarHistorico(tx as unknown as typeof db, {
        evento: 'vinculo_movido',
        colaboradorId: v.colaboradorId,
        liderIdAntigo: input.liderOrigemId,
        liderIdNovo: input.liderDestinoId,
        detalhes: { motivo: input.motivo, origem: origemTipo, via: 'transferencia_time' },
        ator,
      });

      transferidos += 1;
    }
  });

  revalidatePath('/qlp/quadro');
  revalidatePath('/qlp/organograma');
  revalidatePath('/qlp/lideres');
  return { transferidos, ignorados };
}

export async function atribuirVinculosEmMassa(input: {
  colaboradorIds: string[];
  liderId: string;
  motivo: string;
}) {
  if (!input.motivo?.trim()) throw new Error('motivo obrigatório');
  if (!input.colaboradorIds || input.colaboradorIds.length === 0) {
    throw new Error('selecione pelo menos um colaborador');
  }

  await db.transaction(async (tx) => {
    for (const colaboradorId of input.colaboradorIds) {
      const colab = await tx.query.qlpColaboradores.findFirst({
        where: eq(qlpColaboradores.id, colaboradorId),
      });
      if (!colab) throw new Error(`colaborador inexistente: ${colaboradorId}`);

      const lider = await tx.query.qlpLideres.findFirst({
        where: eq(qlpLideres.id, input.liderId),
      });
      if (!lider) throw new Error('líder inexistente');

      const ator = await resolverAtor(colab.filialId);

      if (ator.tipo === 'filial') {
        const tierColab = colab.tierResolvido ?? 'base';
        const isBaseSup = tierColab === 'base' && (lider.tier === 'supervisor' || lider.tier === 'encarregado');
        const isSupCoord = (tierColab === 'supervisor' || tierColab === 'encarregado') && lider.tier === 'coord';
        if (!isBaseSup && !isSupCoord) {
          throw new Error('filial só pode amarrar base↔supervisor/encarregado ou supervisor/encarregado↔coord');
        }
      }

      assertCanLead(lider.tier, colab.tierResolvido ?? 'base', {
        liderNivel: lider.nivel,
        lideradoNivel: colab.nivelResolvido,
      });

      if (!colab.filialId) throw new Error('colaborador sem filial associada');
      const cobre = escopoCobreFilial(
        {
          escopoNacional: lider.escopoNacional,
          filiaisEscopo: lider.filiaisEscopo as string[],
        },
        colab.filialId,
      );
      if (!cobre) {
        throw new Error(`líder não cobre a filial do colaborador: ${colab.nome}`);
      }

      const antigo = await tx.query.qlpVinculos.findFirst({
        where: eq(qlpVinculos.colaboradorId, colaboradorId),
      });

      const origem = ator.tipo === 'admin' ? 'admin' : 'filial';
      if (antigo) {
        await tx
          .update(qlpVinculos)
          .set({
            liderId: input.liderId,
            origem,
            criadoPor: ator.nome,
            createdAt: new Date(),
          })
          .where(eq(qlpVinculos.colaboradorId, colaboradorId));
      } else {
        await tx.insert(qlpVinculos).values({
          colaboradorId,
          liderId: input.liderId,
          origem,
          criadoPor: ator.nome,
        });
      }

      await gravarHistorico(tx as unknown as typeof db, {
        evento: antigo ? 'vinculo_movido' : 'vinculo_criado',
        colaboradorId,
        liderIdAntigo: antigo?.liderId ?? null,
        liderIdNovo: input.liderId,
        detalhes: { motivo: input.motivo, origem },
        ator,
      });
    }
  });

  revalidatePath('/qlp/quadro');
  revalidatePath('/qlp/organograma');
}
