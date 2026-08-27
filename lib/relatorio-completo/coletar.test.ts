import { describe, it, expect } from 'vitest';
import { montarResumoExecutivo } from './coletar';

describe('montarResumoExecutivo', () => {
  const entrada = {
    filialId: 'f1',
    totaisPorIndicador: {
      bh:        [{ filialId: 'f1', valor: 100 }, { filialId: 'f2', valor: 50 }],
      inconsist: [{ filialId: 'f1', valor: 5 },   { filialId: 'f2', valor: 9 }],
      cursos:    [{ filialId: 'f1', valor: 8 },   { filialId: 'f2', valor: 8 }],
      feriados:  [{ filialId: 'f1', valor: 2 },   { filialId: 'f2', valor: 7 }],
      vagas:     [{ filialId: 'f1', valor: 3 },   { filialId: 'f2', valor: 1 }],
    },
    valores: { bh: 100, inconsist: 5, cursos: 8, feriados: 2, vagas: 3 },
    variacoes: {
      bh:     { deltaPct: 12.5, tendencia: 'piorou' as const },
      cursos: { deltaPct: -50, tendencia: 'melhorou' as const },
    },
  };

  it('gera 5 cards com posição e variação corretas', () => {
    const cards = montarResumoExecutivo(entrada);
    expect(cards.map((c) => c.chave)).toEqual(['bh', 'inconsist', 'cursos', 'feriados', 'vagas']);

    const bh = cards.find((c) => c.chave === 'bh')!;
    expect(bh.posicao).toBe(2);          // 100 > 50 → 2º de 2
    expect(bh.variacao).toEqual({ deltaPct: 12.5, tendencia: 'piorou' });

    const feriados = cards.find((c) => c.chave === 'feriados')!;
    expect(feriados.posicao).toBe(1);    // 2 < 7
    expect(feriados.variacao).toBeNull(); // sem histórico
  });
});
