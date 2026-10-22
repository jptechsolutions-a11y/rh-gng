import 'server-only';
import { count, desc, eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import type { Valor } from './tipos';

export interface AlvoColab {
  chapa: string;
  nome: string;
  funcao: string;
  secao: string | null;
  filialCodigo: string;
}

export interface RespostaRow {
  id: string;
  chapa: string | null;
  nome: string | null;
  funcao: string | null;
  secao: string | null;
  filialCodigo: string | null;
  createdAt: string;
  valores: Record<string, Valor>;
}

export interface CotaFilial {
  filialCodigo: string;
  cota: number;
  respondidas: number;
}

/** Lista de pesquisas + respondidas + público-alvo (identificada: ativos do QLP; anônima: soma das cotas = ativos do QLP). */
export async function listarPesquisasComContagem() {
  const [pesqs, resp, alvoRows] = await Promise.all([
    db.select().from(schema.pesquisas).orderBy(desc(schema.pesquisas.createdAt)),
    db
      .select({ pesquisaId: schema.pesquisaRespostas.pesquisaId, total: count() })
      .from(schema.pesquisaRespostas)
      .groupBy(schema.pesquisaRespostas.pesquisaId),
    db.select({ total: count() }).from(schema.qlpColaboradores).where(eq(schema.qlpColaboradores.ativo, true)),
  ]);
  const alvo = alvoRows[0]?.total ?? 0;
  const mapa = new Map(resp.map((r) => [r.pesquisaId, r.total]));
  return pesqs.map((p) => ({ ...p, respondidas: mapa.get(p.id) ?? 0, alvo }));
}

export async function carregarIndicadores(id: string) {
  const pesquisa = await db.query.pesquisas.findFirst({ where: eq(schema.pesquisas.id, id) });
  if (!pesquisa) return null;

  const [perguntas, respostasRaw, alvoRaw] = await Promise.all([
    db
      .select()
      .from(schema.pesquisaPerguntas)
      .where(eq(schema.pesquisaPerguntas.pesquisaId, id))
      .orderBy(schema.pesquisaPerguntas.ordem),
    db.select().from(schema.pesquisaRespostas).where(eq(schema.pesquisaRespostas.pesquisaId, id)),
    db
      .select({
        chapa: schema.qlpColaboradores.chapa,
        nome: schema.qlpColaboradores.nome,
        funcao: schema.qlpColaboradores.funcao,
        secao: schema.qlpColaboradores.secao,
        codfilial: schema.qlpColaboradores.codfilial,
      })
      .from(schema.qlpColaboradores)
      .where(eq(schema.qlpColaboradores.ativo, true)),
  ]);

  const itens = respostasRaw.length
    ? await db
        .select()
        .from(schema.pesquisaRespostaItens)
        .where(inArray(schema.pesquisaRespostaItens.respostaId, respostasRaw.map((r) => r.id)))
    : [];
  const porResposta = new Map<string, Record<string, Valor>>();
  for (const it of itens) {
    const m = porResposta.get(it.respostaId) ?? {};
    m[it.perguntaId] = it.valor;
    porResposta.set(it.respostaId, m);
  }

  const respostas: RespostaRow[] = respostasRaw.map((r) => ({
    id: r.id,
    chapa: r.chapa,
    nome: r.nome,
    funcao: r.funcao,
    secao: r.secao,
    filialCodigo: r.filialCodigo,
    createdAt: r.createdAt.toISOString(),
    valores: porResposta.get(r.id) ?? {},
  }));

  const alvo: AlvoColab[] = alvoRaw.map((a) => ({
    chapa: a.chapa,
    nome: a.nome,
    funcao: a.funcao,
    secao: a.secao,
    filialCodigo: String(a.codfilial),
  }));

  return { pesquisa, perguntas, respostas, alvo };
}
