export type Tendencia = 'melhorou' | 'piorou' | 'neutro';
export type Variacao = { delta: number; deltaPct: number | null; tendencia: Tendencia };

export function calcVariacao(atual: number, anterior: number | null): Variacao {
  const delta = atual - (anterior ?? 0);
  let tendencia: Tendencia = 'neutro';
  if (delta > 0) tendencia = 'piorou';
  else if (delta < 0) tendencia = 'melhorou';

  const deltaPct = anterior && anterior !== 0
    ? Math.round((delta / anterior) * 1000) / 10
    : null;

  return { delta: Math.round(delta * 100) / 100, deltaPct, tendencia };
}

export function formatHoras(n: number): string {
  return `${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} h`;
}

export function formatBRL(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
