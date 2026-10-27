'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import { requireSession } from '@/lib/auth/session';
import { normalizarCodigoFilial } from '@/lib/vagas/normalizar-codigo-filial';
import type { IcResponsavelInput } from '@/lib/ic/tipos';

/** Substitui a lista inteira de responsáveis (edição em tela única). Cada filial só pode estar em um responsável. */
export async function salvarResponsaveisIc(lista: IcResponsavelInput[]): Promise<void> {
  await requireSession('admin');
  const vistos = new Map<string, string>();
  const limpa = lista.map((r, i) => {
    const nome = r.nome.trim();
    if (!nome) throw new Error(`responsável ${i + 1}: informe o nome`);
    if (!/^#[0-9a-fA-F]{6}$/.test(r.cor)) throw new Error(`${nome}: cor inválida`);
    const imagem = r.imagem?.trim() || null;
    if (imagem && !/^\/[\w./-]+$/.test(imagem)) throw new Error(`${nome}: a imagem deve ser um caminho como /ic/personagens/nome.png`);
    const filiais = Array.from(new Set(r.filiais.map((f) => normalizarCodigoFilial(f.trim())).filter(Boolean)));
    for (const f of filiais) {
      const outro = vistos.get(f);
      if (outro) throw new Error(`filial ${f} está em "${outro}" e em "${nome}"`);
      vistos.set(f, nome);
    }
    return { id: r.id, nome, cor: r.cor, imagem, filiais, ordem: i + 1 };
  });

  const atuais = await db.select({ id: schema.icResponsaveis.id }).from(schema.icResponsaveis);
  const manter = new Set(limpa.map((r) => r.id).filter(Boolean) as string[]);
  for (const a of atuais) if (!manter.has(a.id)) await db.delete(schema.icResponsaveis).where(eq(schema.icResponsaveis.id, a.id));
  for (const r of limpa) {
    const valores = { nome: r.nome, cor: r.cor, imagem: r.imagem, filiais: r.filiais, ordem: r.ordem, updatedAt: new Date() };
    if (r.id) await db.update(schema.icResponsaveis).set(valores).where(eq(schema.icResponsaveis.id, r.id));
    else await db.insert(schema.icResponsaveis).values(valores);
  }
  revalidatePath('/ic');
  revalidatePath('/ic/responsaveis');
}
