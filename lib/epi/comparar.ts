import 'server-only';
import { and, desc, eq, ilike, inArray } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import type { Session } from '@/lib/auth/session';
import { getFiliaisVisiveis } from '@/lib/auth/session';
import type { StatusEpi } from './tipos';

export interface AtualizacaoEpi {
  id: string;
  arquivo: string;
  dataRef: string; // yyyy-mm-dd
  linhas: number;
}

export interface Contagem {
  colab: number;
  total: number;
  regular: number;
  trocar: number;
  sem: number;
}

export interface CdComparado {
  filial: string;
  nome: string;
  atual: Contagem;
  anterior: Contagem;
}

/** Uma linha (colaborador × EPI) que mudou de situação entre as duas atualizações. */
export interface Movimento {
  filial: string;
  chapa: string;
  nome: string;
  funcao: string;
  epi: string;
  de: StatusEpi | 'NOVO';
  para: StatusEpi | 'REMOVIDO';
}

const vazio = (): Contagem => ({ colab: 0, total: 0, regular: 0, trocar: 0, sem: 0 });

export async function listarAtualizacoesEpi(): Promise<AtualizacaoEpi[]> {
  const imps = await db
    .select()
    .from(schema.epiImports)
    .where(eq(schema.epiImports.concluida, true))
    .orderBy(desc(schema.epiImports.dataRef), desc(schema.epiImports.createdAt));
  return imps.map((i) => ({
    id: i.id,
    arquivo: i.arquivoNome,
    dataRef: i.dataRef ?? i.createdAt.toISOString().slice(0, 10),
    linhas: i.totalLinhas,
  }));
}

/**
 * Compara duas atualizações do painel de EPI (por padrão: a mais recente × a anterior),
 * por CD/filial e item a item (colaborador × EPI). Respeita o escopo de filiais da sessão.
 */
export async function buscarComparativoEpi(s: Session, atualId?: string | null, anteriorId?: string | null) {
  const atualizacoes = await listarAtualizacoesEpi();
  const atual = atualizacoes.find((a) => a.id === atualId) ?? atualizacoes[0] ?? null;
  const anterior =
    atualizacoes.find((a) => a.id === anteriorId && a.id !== atual?.id) ??
    atualizacoes.find((a) => a.id !== atual?.id && (!atual || a.dataRef < atual.dataRef)) ??
    null;
  if (!atual || !anterior) return { atualizacoes, atual, anterior, cds: [] as CdComparado[], movimentos: [] as Movimento[] };

  const escopo = getFiliaisVisiveis(s);
  if (escopo && escopo.length === 0) return { atualizacoes, atual, anterior, cds: [] as CdComparado[], movimentos: [] as Movimento[] };

  const conds = [inArray(schema.epiLinhas.importId, [atual.id, anterior.id]), ilike(schema.epiLinhas.bandeira, 'PERLOG')];
  if (escopo) conds.push(inArray(schema.epiLinhas.filialId, escopo));

  const [raw, filiais] = await Promise.all([
    db
      .select({
        importId: schema.epiLinhas.importId,
        filial: schema.epiLinhas.filialCodigo,
        chapa: schema.epiLinhas.chapa,
        nome: schema.epiLinhas.nome,
        funcao: schema.epiLinhas.funcao,
        codEpi: schema.epiLinhas.codEpi,
        epi: schema.epiLinhas.epi,
        status: schema.epiLinhas.status,
      })
      .from(schema.epiLinhas)
      .where(and(...conds)),
    db.select({ codigo: schema.filiais.codigo, nome: schema.filiais.nome }).from(schema.filiais),
  ]);
  const nomeFilial = new Map(filiais.map((f) => [f.codigo.replace(/^0+(?=\d)/, ''), f.nome]));

  type Linha = (typeof raw)[number];
  const chave = (l: Linha) => `${l.chapa}::${l.codEpi ?? l.epi}`;
  const mapA = new Map<string, Linha>();
  const mapB = new Map<string, Linha>();
  for (const l of raw) (l.importId === atual.id ? mapA : mapB).set(chave(l), l);

  // Contagem por CD nas duas atualizações
  const cds = new Map<string, CdComparado>();
  const colabs = { a: new Map<string, Set<string>>(), b: new Map<string, Set<string>>() };
  const cd = (f: string) => {
    let c = cds.get(f);
    if (!c) { c = { filial: f, nome: nomeFilial.get(f) ?? `Filial ${f}`, atual: vazio(), anterior: vazio() }; cds.set(f, c); }
    return c;
  };
  const soma = (c: Contagem, st: string) => {
    c.total++;
    if (st === 'REGULAR') c.regular++; else if (st === 'TROCAR') c.trocar++; else c.sem++;
  };
  for (const l of mapA.values()) {
    soma(cd(l.filial).atual, l.status);
    (colabs.a.get(l.filial) ?? colabs.a.set(l.filial, new Set()).get(l.filial)!).add(l.chapa);
  }
  for (const l of mapB.values()) {
    soma(cd(l.filial).anterior, l.status);
    (colabs.b.get(l.filial) ?? colabs.b.set(l.filial, new Set()).get(l.filial)!).add(l.chapa);
  }
  for (const c of cds.values()) {
    c.atual.colab = colabs.a.get(c.filial)?.size ?? 0;
    c.anterior.colab = colabs.b.get(c.filial)?.size ?? 0;
  }

  // Movimentos: o que mudou de situação, entrou ou saiu
  const movimentos: Movimento[] = [];
  for (const [k, a] of mapA) {
    const b = mapB.get(k);
    if (!b) movimentos.push({ filial: a.filial, chapa: a.chapa, nome: a.nome, funcao: a.funcao ?? '—', epi: a.epi, de: 'NOVO', para: a.status as StatusEpi });
    else if (b.status !== a.status) movimentos.push({ filial: a.filial, chapa: a.chapa, nome: a.nome, funcao: a.funcao ?? '—', epi: a.epi, de: b.status as StatusEpi, para: a.status as StatusEpi });
  }
  for (const [k, b] of mapB) {
    if (!mapA.has(k)) movimentos.push({ filial: b.filial, chapa: b.chapa, nome: b.nome, funcao: b.funcao ?? '—', epi: b.epi, de: b.status as StatusEpi, para: 'REMOVIDO' });
  }

  const lista = Array.from(cds.values()).sort((x, y) => x.filial.localeCompare(y.filial, undefined, { numeric: true }));
  return { atualizacoes, atual, anterior, cds: lista, movimentos };
}
