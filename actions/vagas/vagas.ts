'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
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
