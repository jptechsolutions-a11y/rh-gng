'use server';

import { revalidatePath } from 'next/cache';
import { asc, eq, sql } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import { requireSession } from '@/lib/auth/session';
import { CLASSIFICACOES, type Classificacao } from '@/lib/relatorio-completo/classificacao-secao';

export type MapeamentoSecao = {
  id: string;
  secao: string;
  classificacao: string;
  atualizadoPorNome: string | null;
  updatedAt: string;
};

/** Todas as seções já mapeadas, ordem alfabética. */
export async function listarMapeamentos(): Promise<MapeamentoSecao[]> {
  await requireSession('admin');
  const rows = await db
    .select()
    .from(schema.vagasSecaoClassificacao)
    .orderBy(asc(schema.vagasSecaoClassificacao.secao));
  return rows.map((r) => ({
    id: r.id,
    secao: r.secao,
    classificacao: r.classificacao,
    atualizadoPorNome: r.atualizadoPorNome,
    updatedAt: r.updatedAt.toISOString(),
  }));
}

/** Seções que existem no quadro/vagas mas ainda NÃO têm mapeamento. */
export async function listarSecoesNaoMapeadas(): Promise<string[]> {
  await requireSession('admin');
  const rows = await db.execute<{ secao: string }>(sql`
    SELECT DISTINCT s.secao FROM (
      SELECT secao FROM vagas_quadro_linhas WHERE secao IS NOT NULL AND btrim(secao) <> ''
      UNION
      SELECT secao FROM vagas WHERE secao IS NOT NULL AND btrim(secao) <> ''
    ) s
    LEFT JOIN vagas_secao_classificacao m ON m.secao = s.secao
    WHERE m.id IS NULL
    ORDER BY s.secao
  `);
  // drizzle postgres-js: db.execute retorna o array de linhas diretamente
  return (rows as unknown as Array<{ secao: string }>).map((r) => r.secao);
}

function validarClassificacao(c: string): Classificacao {
  const ok = (CLASSIFICACOES as string[]).includes(c);
  if (!ok) throw new Error('classificação inválida');
  return c as Classificacao;
}

/** Cria ou atualiza o mapeamento de uma seção. */
export async function salvarMapeamento(secao: string, classificacao: string): Promise<void> {
  const s = await requireSession('admin');
  const secaoLimpa = secao.trim();
  if (!secaoLimpa) throw new Error('seção é obrigatória');
  const cls = validarClassificacao(classificacao);

  await db
    .insert(schema.vagasSecaoClassificacao)
    .values({ secao: secaoLimpa, classificacao: cls, atualizadoPorNome: s.nome })
    .onConflictDoUpdate({
      target: schema.vagasSecaoClassificacao.secao,
      set: { classificacao: cls, atualizadoPorNome: s.nome, updatedAt: new Date() },
    });

  revalidatePath('/admin/config/classificacao-secao');
}

/** Remove o mapeamento de uma seção (volta ao fallback Área de Apoio). */
export async function excluirMapeamento(id: string): Promise<void> {
  await requireSession('admin');
  await db.delete(schema.vagasSecaoClassificacao).where(eq(schema.vagasSecaoClassificacao.id, id));
  revalidatePath('/admin/config/classificacao-secao');
}
