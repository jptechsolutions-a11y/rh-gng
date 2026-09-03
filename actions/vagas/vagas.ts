'use server';

import { revalidatePath } from 'next/cache';
import { eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import { requireSession } from '@/lib/auth/session';

export async function atualizarStatusVaga(vagaId: string, statusId: string) {
  const s = await requireSession();
  if (s.perfil === 'visualizador') throw new Error('perfil somente leitura');

  const vaga = await db.query.vagas.findFirst({ where: eq(schema.vagas.id, vagaId) });
  if (!vaga) throw new Error('vaga não encontrada');
  if (s.perfil === 'filial' && vaga.filialId !== s.filialId) {
    throw new Error('sem permissão para vagas de outra filial');
  }

  const status = await db.query.vagasStatus.findFirst({ where: eq(schema.vagasStatus.id, statusId) });
  if (!status || !status.ativo) throw new Error('status inválido ou inativo');

  const nomeAtor = s.perfil === 'admin' ? (s.nome ?? s.usuario) : s.filialNome;

  await db
    .update(schema.vagas)
    .set({ statusId, statusAtualizadoEm: new Date(), statusAtualizadoPorNome: nomeAtor })
    .where(eq(schema.vagas.id, vagaId));

  revalidatePath('/vagas');
}

/**
 * Atualiza o status de várias vagas de uma vez (mesma regra de permissão de
 * `atualizarStatusVaga`, aplicada por vaga: admin edita qualquer filial,
 * filial só edita as próprias, visualizador é bloqueado).
 */
export async function atualizarStatusVagasEmLote(vagaIds: string[], statusId: string) {
  const s = await requireSession();
  if (s.perfil === 'visualizador') throw new Error('perfil somente leitura');
  if (!vagaIds || vagaIds.length === 0) throw new Error('selecione pelo menos uma vaga');

  const status = await db.query.vagasStatus.findFirst({ where: eq(schema.vagasStatus.id, statusId) });
  if (!status || !status.ativo) throw new Error('status inválido ou inativo');

  const vagasAlvo = await db
    .select({ id: schema.vagas.id, filialId: schema.vagas.filialId })
    .from(schema.vagas)
    .where(inArray(schema.vagas.id, vagaIds));
  if (vagasAlvo.length !== vagaIds.length) throw new Error('alguma vaga selecionada não existe mais');

  if (s.perfil === 'filial') {
    const foraDaFilial = vagasAlvo.some((v) => v.filialId !== s.filialId);
    if (foraDaFilial) throw new Error('sem permissão para vagas de outra filial');
  }

  const nomeAtor = s.perfil === 'admin' ? (s.nome ?? s.usuario) : s.filialNome;

  await db
    .update(schema.vagas)
    .set({ statusId, statusAtualizadoEm: new Date(), statusAtualizadoPorNome: nomeAtor })
    .where(inArray(schema.vagas.id, vagaIds));

  revalidatePath('/vagas');
  return { atualizadas: vagasAlvo.length };
}

/**
 * Fecha manualmente uma vaga "excedente" — quando a última planilha
 * importada reduziu o número de vagas em aberto de uma combinação, mas a(s)
 * vaga(s) que sobraram já saíram do status "Em aberto" (estão em processo:
 * Pendente Admissão, Entrega de Documentos, etc.), o import nunca as fecha
 * sozinho — quem está na filial precisa confirmar manualmente qual vaga
 * encerrar (normalmente porque a posição já foi preenchida).
 *
 * Mesma regra de permissão das outras ações de vaga: admin fecha qualquer
 * filial, filial só fecha as próprias, visualizador é bloqueado.
 */
export async function fecharVagaExcedente(vagaId: string) {
  const s = await requireSession();
  if (s.perfil === 'visualizador') throw new Error('perfil somente leitura');

  const vaga = await db.query.vagas.findFirst({ where: eq(schema.vagas.id, vagaId) });
  if (!vaga) throw new Error('vaga não encontrada');
  if (!vaga.ativa) throw new Error('vaga já está fechada');
  if (s.perfil === 'filial' && vaga.filialId !== s.filialId) {
    throw new Error('sem permissão para vagas de outra filial');
  }

  const nomeAtor = s.perfil === 'admin' ? (s.nome ?? s.usuario) : s.filialNome;

  await db
    .update(schema.vagas)
    .set({
      ativa: false,
      motivoFechamento: 'excedente_manual',
      statusAtualizadoEm: new Date(),
      statusAtualizadoPorNome: nomeAtor,
    })
    .where(eq(schema.vagas.id, vagaId));

  revalidatePath('/vagas');
}
