import 'server-only';
import { db, schema } from '@/db/client';

export type Classificacao = 'Área de Apoio' | 'Operação' | 'Transporte' | 'Expansão';

/** Ordem de exibição nas tabelas. */
export const CLASSIFICACOES: Classificacao[] = ['Área de Apoio', 'Expansão', 'Operação', 'Transporte'];

export const CLASSIFICACAO_FALLBACK: Classificacao = 'Área de Apoio';

/** Normaliza p/ casar a seção do quadro com a chave do DE-PARA. */
export function normSecao(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
}

/** Carrega o DE-PARA do banco como Map<secaoNormalizada, Classificacao>. */
export async function carregarMapaClassificacao(): Promise<Map<string, Classificacao>> {
  const rows = await db.select().from(schema.vagasSecaoClassificacao);
  const m = new Map<string, Classificacao>();
  for (const r of rows) m.set(normSecao(r.secao), r.classificacao as Classificacao);
  return m;
}

/** Classifica uma seção usando um mapa já carregado. Fallback: Área de Apoio. */
export function classificarSecao(secao: string | null | undefined, mapa: Map<string, Classificacao>): Classificacao {
  if (!secao) return CLASSIFICACAO_FALLBACK;
  return mapa.get(normSecao(secao)) ?? CLASSIFICACAO_FALLBACK;
}
