'use server';

// Ações PÚBLICAS (sem login): chamadas pela página /p/[slug].
// Nada aqui usa requireSession — a autorização é o próprio link (slug) + as regras da pesquisa.

import { and, count, eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import { candidatosChapa, type Valor } from '@/lib/pesquisas/tipos';
import { validarRespostas } from '@/lib/pesquisas/validar';

export interface ColaboradorPesquisa {
  chapa: string;
  nome: string;
  funcao: string;
  secao: string | null;
  filialCodigo: string;
}

async function pesquisaAberta(slug: string) {
  const p = await db.query.pesquisas.findFirst({ where: eq(schema.pesquisas.slug, slug) });
  if (!p) throw new Error('pesquisa não encontrada');
  if (p.status !== 'aberta') throw new Error('esta pesquisa foi encerrada');
  return p;
}

async function acharColaborador(chapaDigitada: string) {
  const cands = candidatosChapa(chapaDigitada);
  if (cands.length === 0) return null;
  const rows = await db
    .select({
      chapa: schema.qlpColaboradores.chapa,
      nome: schema.qlpColaboradores.nome,
      funcao: schema.qlpColaboradores.funcao,
      secao: schema.qlpColaboradores.secao,
      filialId: schema.qlpColaboradores.filialId,
      codfilial: schema.qlpColaboradores.codfilial,
    })
    .from(schema.qlpColaboradores)
    .where(and(inArray(schema.qlpColaboradores.chapa, cands), eq(schema.qlpColaboradores.ativo, true)))
    .limit(1);
  return rows[0] ?? null;
}

/** Pesquisa identificada: busca nome/função/seção/filial pela matrícula e avisa se já respondeu. */
export async function buscarColaboradorPesquisa(
  slug: string,
  chapaDigitada: string,
): Promise<{ ok: true; colaborador: ColaboradorPesquisa } | { ok: false; erro: string }> {
  try {
    const p = await pesquisaAberta(slug);
    if (p.anonima) return { ok: false, erro: 'esta pesquisa é anônima' };
    const c = await acharColaborador(chapaDigitada);
    if (!c) return { ok: false, erro: 'Matrícula não encontrada. Confira o número e tente de novo.' };
    const ja = await db.query.pesquisaRespostas.findFirst({
      where: and(eq(schema.pesquisaRespostas.pesquisaId, p.id), eq(schema.pesquisaRespostas.chapa, c.chapa)),
    });
    if (ja) return { ok: false, erro: 'Esta matrícula já respondeu a pesquisa.' };
    return {
      ok: true,
      colaborador: {
        chapa: c.chapa,
        nome: c.nome,
        funcao: c.funcao,
        secao: c.secao,
        filialCodigo: String(c.codfilial),
      },
    };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'erro ao buscar matrícula' };
  }
}

/** Colaboradores ativos (cota) e respostas já enviadas por filial, para pesquisa anônima. */
export async function cotaPorFilial(pesquisaId: string) {
  const cota = await db
    .select({ filialId: schema.qlpColaboradores.filialId, total: count() })
    .from(schema.qlpColaboradores)
    .where(eq(schema.qlpColaboradores.ativo, true))
    .groupBy(schema.qlpColaboradores.filialId);
  const feitas = await db
    .select({ filialId: schema.pesquisaRespostas.filialId, total: count() })
    .from(schema.pesquisaRespostas)
    .where(eq(schema.pesquisaRespostas.pesquisaId, pesquisaId))
    .groupBy(schema.pesquisaRespostas.filialId);
  const mapaFeitas = new Map(feitas.map((f) => [f.filialId, f.total]));
  return cota
    .filter((c): c is { filialId: string; total: number } => !!c.filialId)
    .map((c) => ({ filialId: c.filialId, cota: c.total, respondidas: mapaFeitas.get(c.filialId) ?? 0 }));
}

export async function enviarRespostaPesquisa(
  slug: string,
  input: { chapa?: string; filialId?: string; respostas: Record<string, Valor | null> },
): Promise<{ ok: true } | { ok: false; erro: string }> {
  try {
    const p = await pesquisaAberta(slug);
    const perguntas = await db
      .select()
      .from(schema.pesquisaPerguntas)
      .where(eq(schema.pesquisaPerguntas.pesquisaId, p.id))
      .orderBy(schema.pesquisaPerguntas.ordem);
    const itens = validarRespostas(perguntas, input.respostas ?? {});

    let quem: typeof schema.pesquisaRespostas.$inferInsert;
    if (p.anonima) {
      if (!input.filialId) throw new Error('selecione a sua filial');
      const filial = await db.query.filiais.findFirst({ where: eq(schema.filiais.id, input.filialId) });
      if (!filial) throw new Error('filial inválida');
      const cotas = await cotaPorFilial(p.id);
      const c = cotas.find((x) => x.filialId === filial.id);
      if (!c) throw new Error('filial sem colaboradores cadastrados');
      if (c.respondidas >= c.cota) throw new Error(`as respostas da filial ${filial.codigo} já foram completadas`);
      quem = { pesquisaId: p.id, filialId: filial.id, filialCodigo: filial.codigo };
    } else {
      const col = await acharColaborador(input.chapa ?? '');
      if (!col) throw new Error('matrícula não encontrada');
      quem = {
        pesquisaId: p.id,
        chapa: col.chapa,
        nome: col.nome,
        funcao: col.funcao,
        secao: col.secao,
        filialId: col.filialId,
        filialCodigo: String(col.codfilial),
      };
    }

    let respostaId: string;
    try {
      const [r] = await db.insert(schema.pesquisaRespostas).values(quem).returning({ id: schema.pesquisaRespostas.id });
      respostaId = r!.id;
    } catch (e) {
      const msg = `${(e as Error)?.message ?? ''} ${(e as { code?: string })?.code ?? ''}`;
      if (!p.anonima && /unique|duplicate|23505/i.test(msg)) {
        throw new Error('Esta matrícula já respondeu a pesquisa.');
      }
      throw e;
    }
    try {
      await db.insert(schema.pesquisaRespostaItens).values(
        itens.map((i) => ({ respostaId, perguntaId: i.perguntaId, valor: i.valor })),
      );
    } catch (e) {
      await db.delete(schema.pesquisaRespostas).where(eq(schema.pesquisaRespostas.id, respostaId));
      throw e;
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'erro ao enviar resposta' };
  }
}
