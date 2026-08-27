import { describe, it, expect } from 'vitest';
import { posicaoNoRanking } from './ranking';

describe('posicaoNoRanking', () => {
  const totais = [
    { filialId: 'a', valor: 30 },
    { filialId: 'b', valor: 10 },
    { filialId: 'c', valor: 20 },
  ];

  it('menor valor = posicao 1', () => {
    expect(posicaoNoRanking('b', totais)).toEqual({ posicao: 1, total: 3 });
  });

  it('maior valor = ultima posicao', () => {
    expect(posicaoNoRanking('a', totais)).toEqual({ posicao: 3, total: 3 });
  });

  it('empate recebe mesma posicao (dense rank)', () => {
    const t = [
      { filialId: 'a', valor: 10 },
      { filialId: 'b', valor: 10 },
      { filialId: 'c', valor: 40 },
    ];
    expect(posicaoNoRanking('b', t)).toEqual({ posicao: 1, total: 3 });
    expect(posicaoNoRanking('c', t)).toEqual({ posicao: 2, total: 3 });
  });

  it('conjunto com uma filial retorna posicao null', () => {
    expect(posicaoNoRanking('a', [{ filialId: 'a', valor: 5 }])).toEqual({ posicao: null, total: 1 });
  });

  it('filial ausente do conjunto retorna posicao null', () => {
    expect(posicaoNoRanking('z', totais)).toEqual({ posicao: null, total: 3 });
  });
});
