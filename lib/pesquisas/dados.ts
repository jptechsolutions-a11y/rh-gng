import 'server-only';
import { count, desc, eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import type { Valor } from './tipos';
import { normalizarCodigoFilial } from '@/lib/vagas/normalizar-codigo-filial';

const noAlvo = (alvo: string[] | null, codigo: string | number | null | undefined) =>
  !alvo || (codigo != null && alvo.includes(normalizarCodigoFilial(String(codigo))));

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

/** Lista de pesquisas + respondidas + público-alvo — só contam as filiais em que a pesquisa é válida. */
export async function listarPesquisasComContagem() {
  const [pesqs, resp, qlp] = await Promise.all([
    db.select().from(schema.pesquisas).orderBy(desc(schema.pesquisas.createdAt)),
    db
      .select({ pesquisaId: schema.pesquisaRespostas.pesquisaId, filial: schema.pesquisaRespostas.filialCodigo, total: count() })
      .from(schema.pesquisaRespostas)
      .groupBy(schema.pesquisaRespostas.pesquisaId, schema.pesquisaRespostas.filialCodigo),
    db
      .select({ codfilial: schema.qlpColaboradores.codfilial, total: count() })
      .from(schema.qlpColaboradores)
      .where(eq(schema.qlpColaboradores.ativo, true))
      .groupBy(schema.qlpColaboradores.codfilial),
  ]);
  return pesqs.map((p) => {
    const alvo = qlp.filter((q) => noAlvo(p.filiaisAlvo, q.codfilial)).reduce((s, q) => s + q.total, 0);
    const respondidas = resp
      .filter((r) => r.pesquisaId === p.id && noAlvo(p.filiaisAlvo, r.filial))
      .reduce((s, r) => s + r.total, 0);
    return { ...p, respondidas, alvo };
  });
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

  // Respostas de filiais fora da pesquisa não entram nos indicadores (continuam guardadas).
  const respostasValidas = respostasRaw.filter((r) => noAlvo(pesquisa.filiaisAlvo, r.filialCodigo));
  const itens = respostasValidas.length
    ? await db
        .select()
        .from(schema.pesquisaRespostaItens)
        .where(inArray(schema.pesquisaRespostaItens.respostaId, respostasValidas.map((r) => r.id)))
    : [];
  const porResposta = new Map<string, Record<string, Valor>>();
  for (const it of itens) {
    const m = porResposta.get(it.respostaId) ?? {};
    m[it.perguntaId] = it.valor;
    porResposta.set(it.respostaId, m);
  }

  const respostas: RespostaRow[] = respostasValidas.map((r) => ({
    id: r.id,
    chapa: r.chapa,
    nome: r.nome,
    funcao: r.funcao,
    secao: r.secao,
    filialCodigo: r.filialCodigo,
    createdAt: r.createdAt.toISOString(),
    valores: porResposta.get(r.id) ?? {},
  }));

  const alvo: AlvoColab[] = alvoRaw.filter((a) => noAlvo(pesquisa.filiaisAlvo, a.codfilial)).map((a) => ({
    chapa: a.chapa,
    nome: a.nome,
    funcao: a.funcao,
    secao: a.secao,
    filialCodigo: String(a.codfilial),
  }));

  return { pesquisa, perguntas, respostas, alvo };
}
