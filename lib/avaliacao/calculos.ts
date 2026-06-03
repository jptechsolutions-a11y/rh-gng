export type Classificacao = 'EXCELENTE' | 'BOM' | 'REGULAR' | 'PRECISA MELHORAR';
export type Evolucao = 'primeira' | 'positiva' | 'negativa' | 'estavel';

export function calcularPontuacao(notas: number[]): number {
  if (notas.length === 0) throw new Error('notas vazias');
  const soma = notas.reduce((a, b) => a + b, 0);
  return Math.round((soma / notas.length) * 100) / 100;
}

export function classificar(pontuacao: number): Classificacao {
  if (pontuacao >= 4.5) return 'EXCELENTE';
  if (pontuacao >= 3.5) return 'BOM';
  if (pontuacao >= 2.5) return 'REGULAR';
  return 'PRECISA MELHORAR';
}

export function calcularEvolucao(atual: number, anterior: number | null): Evolucao {
  if (anterior === null) return 'primeira';
  const delta = Math.round((atual - anterior) * 100) / 100;
  if (delta >= 0.3) return 'positiva';
  if (delta <= -0.3) return 'negativa';
  return 'estavel';
}

export const CLASSIFICACAO_CORES: Record<Classificacao, { bg: string; text: string; border: string }> = {
  'EXCELENTE':         { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-600' },
  'BOM':               { bg: 'bg-sky-50',     text: 'text-sky-700',     border: 'border-sky-600' },
  'REGULAR':           { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-600' },
  'PRECISA MELHORAR':  { bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-600' },
};
