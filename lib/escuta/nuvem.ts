import { STOPWORDS_PT } from './stopwords-pt';

export type PalavraContagem = { text: string; value: number };

export function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

export function tokenizar(texto: string): string[] {
  if (!texto) return [];
  return normalizar(texto)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !STOPWORDS_PT.has(t));
}

export function contarOcorrencias(textos: string[], topN = 50): PalavraContagem[] {
  const mapa = new Map<string, number>();
  for (const t of textos) {
    for (const tok of tokenizar(t)) {
      mapa.set(tok, (mapa.get(tok) ?? 0) + 1);
    }
  }
  return [...mapa.entries()]
    .map(([text, value]) => ({ text, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, topN);
}

// Verifica se o texto contem a palavra (ja normalizada) como token completo.
export function textoContemPalavra(texto: string, palavraNorm: string): boolean {
  const re = new RegExp(`\\b${palavraNorm}\\b`);
  return re.test(normalizar(texto));
}
