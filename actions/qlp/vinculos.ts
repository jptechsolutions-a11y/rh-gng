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
      const isBaseSup = tierColab === 'base' && lider.tier === 'supervisor';
      const isSupCoord = tierColab === 'supervisor' && lider.tier === 'coord';
      if (!isBaseSup && !isSupCoord) {
        throw new Error('filial só pode amarrar base↔supervisor ou supervisor↔coord');
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
