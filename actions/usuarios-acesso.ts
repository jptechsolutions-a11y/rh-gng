'use server';

import { db, schema } from '@/db/client';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireSession } from '@/lib/auth/session';
import { hashPassword } from '@/lib/auth/password';

export type UsuarioAcessoLinha = {
  id: string;
  usuario: string;
  nome: string;
  escopo: 'lista' | 'nacional';
  ativo: boolean;
  qtdFiliais: number;
  filiaisIds: string[];
  createdAt: string;
};

export async function listarUsuariosAcesso(): Promise<UsuarioAcessoLinha[]> {
  await requireSession('admin');
  const rows = await db
    .select({
      id: schema.usuariosAcesso.id,
      usuario: schema.usuariosAcesso.usuario,
      nome: schema.usuariosAcesso.nome,
      escopo: schema.usuariosAcesso.escopo,
      ativo: schema.usuariosAcesso.ativo,
      createdAt: schema.usuariosAcesso.createdAt,
    })
    .from(schema.usuariosAcesso)
    .orderBy(schema.usuariosAcesso.usuario);

  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const vinculos = await db
    .select({
      usuarioAcessoId: schema.usuariosAcessoFiliais.usuarioAcessoId,
      filialId: schema.usuariosAcessoFiliais.filialId,
    })
    .from(schema.usuariosAcessoFiliais)
    .where(inArray(schema.usuariosAcessoFiliais.usuarioAcessoId, ids));

  const byUser = new Map<string, string[]>();
  for (const v of vinculos) {
    const arr = byUser.get(v.usuarioAcessoId) ?? [];
    arr.push(v.filialId);
    byUser.set(v.usuarioAcessoId, arr);
  }

  return rows.map((r) => {
    const filiais = byUser.get(r.id) ?? [];
    return {
      id: r.id,
      usuario: r.usuario,
      nome: r.nome,
      escopo: r.escopo === 'nacional' ? 'nacional' : 'lista',
      ativo: r.ativo,
      qtdFiliais: filiais.length,
      filiaisIds: filiais,
      createdAt: r.createdAt.toISOString(),
    };
  });
}

const CriarSchema = z.object({
  usuario: z.string().trim().min(3).max(60).regex(/^[a-zA-Z0-9._-]+$/, 'Use letras, números, ponto, hífen ou underline'),
  nome: z.string().trim().min(2).max(120),
  senha: z.string().min(6).max(200),
  escopo: z.enum(['lista', 'nacional']),
  filiaisIds: z.array(z.string().uuid()).default([]),
});

export async function criarUsuarioAcesso(input: unknown) {
  const s = await requireSession('admin');
  const data = CriarSchema.parse(input);
  if (data.escopo === 'lista' && data.filiaisIds.length === 0) {
    throw new Error('Selecione ao menos uma filial.');
  }
  const senhaHash = await hashPassword(data.senha);
  await db.transaction(async (tx) => {
    const [row] = await tx.insert(schema.usuariosAcesso).values({
      usuario: data.usuario,
      nome: data.nome,
      senhaHash,
      escopo: data.escopo,
      ativo: true,
      createdBy: s.adminId,
    }).returning({ id: schema.usuariosAcesso.id });
    if (!row) throw new Error('Falha ao criar usuário');
    if (data.escopo === 'lista' && data.filiaisIds.length) {
      await tx.insert(schema.usuariosAcessoFiliais).values(
        data.filiaisIds.map((fid) => ({ usuarioAcessoId: row.id, filialId: fid })),
      );
    }
  });
  revalidatePath('/admin/config/usuarios');
}

const EditarSchema = z.object({
  id: z.string().uuid(),
  nome: z.string().trim().min(2).max(120),
  escopo: z.enum(['lista', 'nacional']),
  filiaisIds: z.array(z.string().uuid()).default([]),
});

export async function editarUsuarioAcesso(input: unknown) {
  await requireSession('admin');
  const data = EditarSchema.parse(input);
  if (data.escopo === 'lista' && data.filiaisIds.length === 0) {
    throw new Error('Selecione ao menos uma filial.');
  }
  await db.transaction(async (tx) => {
    await tx.update(schema.usuariosAcesso)
      .set({ nome: data.nome, escopo: data.escopo })
      .where(eq(schema.usuariosAcesso.id, data.id));
    await tx.delete(schema.usuariosAcessoFiliais)
      .where(eq(schema.usuariosAcessoFiliais.usuarioAcessoId, data.id));
    if (data.escopo === 'lista' && data.filiaisIds.length) {
      await tx.insert(schema.usuariosAcessoFiliais).values(
        data.filiaisIds.map((fid) => ({ usuarioAcessoId: data.id, filialId: fid })),
      );
    }
  });
  revalidatePath('/admin/config/usuarios');
}

const SenhaSchema = z.object({
  id: z.string().uuid(),
  senha: z.string().min(6).max(200),
});

export async function resetarSenhaUsuarioAcesso(input: unknown) {
  await requireSession('admin');
  const { id, senha } = SenhaSchema.parse(input);
  const senhaHash = await hashPassword(senha);
  await db.update(schema.usuariosAcesso).set({ senhaHash }).where(eq(schema.usuariosAcesso.id, id));
  // Invalida sessões ativas (segurança após troca de senha).
  await db.delete(schema.sessoes).where(eq(schema.sessoes.usuarioAcessoId, id));
  revalidatePath('/admin/config/usuarios');
}

const ToggleSchema = z.object({ id: z.string().uuid(), ativo: z.boolean() });

export async function toggleUsuarioAcesso(input: unknown) {
  await requireSession('admin');
  const { id, ativo } = ToggleSchema.parse(input);
  await db.update(schema.usuariosAcesso).set({ ativo }).where(eq(schema.usuariosAcesso.id, id));
  if (!ativo) {
    // Desativando: derruba sessões.
    await db.delete(schema.sessoes).where(eq(schema.sessoes.usuarioAcessoId, id));
  }
  revalidatePath('/admin/config/usuarios');
}

export async function listarFiliais() {
  await requireSession('admin');
  const rows = await db
    .select({
      id: schema.filiais.id,
      codigo: schema.filiais.codigo,
      nome: schema.filiais.nome,
      ativa: schema.filiais.ativa,
    })
    .from(schema.filiais)
    .orderBy(schema.filiais.codigo);
  return rows;
}
