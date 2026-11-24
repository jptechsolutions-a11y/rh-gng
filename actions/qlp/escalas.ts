'use server';

import { db } from '@/db/client';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { qlpColaboradores, qlpEscalas } from '@/db/schema';
import { gravarHistorico, type AtorContexto } from './_shared';
import { getSession, requireSession } from '@/lib/auth/session';
import { normalizarDias } from '@/lib/qlp/escala';
import { revalidatePath } from 'next/cache';

function revalidarTudo() {
  revalidatePath('/qlp/escalas');
  revalidatePath('/qlp/quadro');
  revalidatePath('/qlp/indicadores');
  revalidatePath('/qlp/lideres');
}

function validarNome(nome: string): string {
  const n = (nome ?? '').trim().replace(/\s+/g, ' ');
  if (n.length < 2) throw new Error('informe um nome para a escala');
  if (n.length > 60) throw new Error('nome muito longo (máx. 60 caracteres)');
  return n;
}

function validarDias(dias: unknown): number[] {
  const d = normalizarDias(dias);
  if (d.length === 0) throw new Error('marque pelo menos um dia da semana');
  return d;
}

async function nomeEmUso(nome: string, ignorarId?: string): Promise<boolean> {
  const rows = await db
    .select({ id: qlpEscalas.id })
    .from(qlpEscalas)
    .where(sql`lower(${qlpEscalas.nome}) = lower(${nome})`);
  return rows.some((r) => r.id !== ignorarId);
}

export async function criarEscala(input: { nome: string; dias: number[] }) {
  await requireSession('admin');
  const nome = validarNome(input.nome);
  const dias = validarDias(input.dias);
  if (await nomeEmUso(nome)) throw new Error('já existe uma escala com esse nome');

  await db.insert(qlpEscalas).values({ nome, dias });
  revalidarTudo();
}

export async function atualizarEscala(input: {
  id: string;
  nome: string;
  dias: number[];
  ativo: boolean;
}) {
  await requireSession('admin');
  const nome = validarNome(input.nome);
  const dias = validarDias(input.dias);
  if (await nomeEmUso(nome, input.id)) throw new Error('já existe uma escala com esse nome');

  const r = await db
    .update(qlpEscalas)
    .set({ nome, dias, ativo: input.ativo })
    .where(eq(qlpEscalas.id, input.id))
    .returning({ id: qlpEscalas.id });
  if (r.length === 0) throw new Error('escala inexistente');
  revalidarTudo();
}

export async function excluirEscala(id: string) {
  await requireSession('admin');
  const [uso] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(qlpColaboradores)
    .where(eq(qlpColaboradores.escalaId, id));
  if (Number(uso?.n ?? 0) > 0) {
    throw new Error('há colaboradores nesta escala — desative em vez de excluir');
  }
  await db.delete(qlpEscalas).where(eq(qlpEscalas.id, id));
  revalidarTudo();
}

async function resolverAtor(): Promise<{ ator: AtorContexto; filialId: string | null }> {
  const s = await getSession();
  if (!s) throw new Error('não autenticado');
  if (s.perfil === 'admin') {
    return {
      ator: { tipo: 'admin', id: s.adminId, nome: s.nome ?? s.usuario, filialContextoId: null },
      filialId: null,
    };
  }
  if (s.perfil === 'filial') {
    return {
      ator: { tipo: 'filial', id: s.filialId, nome: s.filialNome, filialContextoId: s.filialId },
      filialId: s.filialId,
    };
  }
  throw new Error('perfil não autorizado para esta ação');
}

/**
 * Define (ou limpa, com `escalaId = null`) a escala de um ou mais colaboradores.
 * Admin: qualquer colaborador. Filial: só os da própria filial.
 * Só aceita escala ativa. Registra `escala_alterada` no histórico por colaborador alterado.
 */
export async function definirEscalaColaboradores(input: {
  colaboradorIds: string[];
  escalaId: string | null;
}): Promise<{ alterados: number }> {
  const ids = Array.from(new Set(input.colaboradorIds ?? []));
  if (ids.length === 0) throw new Error('selecione pelo menos um colaborador');
  if (ids.length > 2000) throw new Error('seleção grande demais (máx. 2000 por vez)');

  const { ator, filialId } = await resolverAtor();
  let alterados = 0;

  await db.transaction(async (tx) => {
    let escala: { id: string; nome: string; ativo: boolean } | undefined;
    if (input.escalaId) {
      escala = (
        await tx
          .select({ id: qlpEscalas.id, nome: qlpEscalas.nome, ativo: qlpEscalas.ativo })
          .from(qlpEscalas)
          .where(eq(qlpEscalas.id, input.escalaId))
      )[0];
      if (!escala) throw new Error('escala inexistente');
      if (!escala.ativo) throw new Error('esta escala está desativada');
    }

    const colabs = await tx
      .select({
        id: qlpColaboradores.id,
        nome: qlpColaboradores.nome,
        filialId: qlpColaboradores.filialId,
        escalaId: qlpColaboradores.escalaId,
      })
      .from(qlpColaboradores)
      .where(inArray(qlpColaboradores.id, ids));

    if (colabs.length !== ids.length) throw new Error('colaborador inexistente na seleção');
    if (filialId) {
      const fora = colabs.find((c) => c.filialId !== filialId);
      if (fora) throw new Error('filial só altera colaboradores da própria filial');
    }

    const mudam = colabs.filter((c) => (c.escalaId ?? null) !== (escala?.id ?? null));
    if (mudam.length === 0) return;

    // Nome da escala anterior (para o histórico ficar legível mesmo se ela for renomeada depois).
    const antigasIds = Array.from(new Set(mudam.map((c) => c.escalaId).filter(Boolean) as string[]));
    const antigas = antigasIds.length
      ? await tx
          .select({ id: qlpEscalas.id, nome: qlpEscalas.nome })
          .from(qlpEscalas)
          .where(inArray(qlpEscalas.id, antigasIds))
      : [];
    const nomeAntiga = new Map(antigas.map((e) => [e.id, e.nome]));

    await tx
      .update(qlpColaboradores)
      .set({ escalaId: escala?.id ?? null, updatedAt: new Date() })
      .where(
        and(
          inArray(
            qlpColaboradores.id,
            mudam.map((c) => c.id),
          ),
        ),
      );

    for (const c of mudam) {
      await gravarHistorico(tx as unknown as typeof db, {
        evento: 'escala_alterada',
        colaboradorId: c.id,
        detalhes: {
          antes: c.escalaId ? (nomeAntiga.get(c.escalaId) ?? null) : null,
          depois: escala?.nome ?? null,
        },
        ator: { ...ator, filialContextoId: c.filialId },
      });
    }
    alterados = mudam.length;
  });

  revalidarTudo();
  return { alterados };
}
