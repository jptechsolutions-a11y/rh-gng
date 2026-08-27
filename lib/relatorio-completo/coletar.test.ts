import { describe, it, expect } from 'vitest';
import { montarRankingIndicador } from './coletar';

describe('montarRankingIndicador', () => {
  const cds = [
    { filialId: 'a', codigo: '001', nome: 'A' },
    { filialId: 'b', codigo: '002', nome: 'B' },
    { filialId: 'c', codigo: '003', nome: 'C' },
  ];

  it('ordena por valor asc e atribui posições', () => {
    const r = montarRankingIndicador({
      chave: 'inconsist', titulo: 'Inconsistências', temHistorico: false,
      metaNula: false, cds,
      valorAtual: new Map([['a', 30], ['b', 10], ['c', 20]]),
      valorAnterior: new Map(),
      fmt: (n) => String(n),
    });
    expect(r.cds.map((c) => c.nome)).toEqual(['B', 'C', 'A']);
    expect(r.cds.map((c) => c.posicao)).toEqual([1, 2, 3]);
    expect(r.cds[0]!.variacao).toBeNull();
    expect(r.semDados).toBe(false);
  });

  it('com histórico calcula deltaPct e tendência', () => {
    const r = montarRankingIndicador({
      chave: 'bh', titulo: 'Banco de Horas', temHistorico: true,
      metaNula: false, cds,
      valorAtual: new Map([['a', 120], ['b', 100], ['c', 90]]),
      valorAnterior: new Map([['a', 100], ['b', 100], ['c', 120]]),
      fmt: (n) => `${n} h`,
    });
    const a = r.cds.find((c) => c.nome === 'A')!;
    expect(a.variacao).toEqual({ deltaPct: 20, tendencia: 'piorou' });
    const c = r.cds.find((c) => c.nome === 'C')!;
    expect(c.variacao!.tendencia).toBe('melhorou');
  });

  it('todos zerados + meta nula ⇒ semDados', () => {
    const r = montarRankingIndicador({
      chave: 'feriados', titulo: 'Feriados', temHistorico: false,
      metaNula: true, cds,
      valorAtual: new Map(), valorAnterior: new Map(),
      fmt: (n) => String(n),
    });
    expect(r.semDados).toBe(true);
    expect(r.cds.every((c) => c.valor === 0)).toBe(true);
  });
});
