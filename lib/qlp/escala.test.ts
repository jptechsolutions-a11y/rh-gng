import { describe, it, expect } from 'vitest';
import { contarPorDia, formatarDias, normalizarDias, pivotar, rotuloEscala } from './escala';

describe('contarPorDia', () => {
  it('soma os colaboradores de cada escala nos dias dela', () => {
    const r = contarPorDia([
      { dias: [1, 2, 3, 4, 5], qtd: 10 },
      { dias: [2, 3, 4, 5, 6], qtd: 4 },
    ]);
    expect(r).toEqual([0, 10, 14, 14, 14, 14, 4]);
  });
  it('sem escalas, tudo zero', () => expect(contarPorDia([])).toEqual([0, 0, 0, 0, 0, 0, 0]));
  it('ignora dias inválidos', () => {
    expect(contarPorDia([{ dias: [1, 9, 'x'], qtd: 3 }])).toEqual([0, 3, 0, 0, 0, 0, 0]);
  });
});

describe('pivotar', () => {
  const linhas = [
    { chave: 'Auxiliar', escalaId: 'a', qtd: 5 },
    { chave: 'Auxiliar', escalaId: 'b', qtd: 2 },
    { chave: 'Auxiliar', escalaId: null, qtd: 1 },
    { chave: 'Conferente', escalaId: 'a', qtd: 3 },
    { chave: 'Motorista', escalaId: null, qtd: 3 },
    { chave: 'Zelador', escalaId: 'b', qtd: 1 },
  ];
  it('agrupa por chave, soma e ordena por total e nome', () => {
    const { linhas: r, resto } = pivotar(linhas);
    expect(r.map((l) => l.chave)).toEqual(['Auxiliar', 'Conferente', 'Motorista', 'Zelador']);
    expect(r[0]).toEqual({ chave: 'Auxiliar', total: 8, semEscala: 1, porEscala: { a: 5, b: 2 } });
    expect(resto).toBe(0);
  });
  it('respeita a ordem fixa e deixa o resto por total', () => {
    const { linhas: r } = pivotar(linhas, undefined, ['Zelador', 'Motorista']);
    expect(r.map((l) => l.chave)).toEqual(['Zelador', 'Motorista', 'Auxiliar', 'Conferente']);
  });
  it('corta no limite e devolve o resto', () => {
    const { linhas: r, resto } = pivotar(linhas, 2);
    expect(r.map((l) => l.chave)).toEqual(['Auxiliar', 'Conferente']);
    expect(resto).toBe(4);
  });
});

describe('normalizarDias', () => {
  it('ordena, remove repetidos e descarta valores inválidos', () => {
    expect(normalizarDias([5, 1, 1, 3, 9, -1, 'x', 2.5, '4'])).toEqual([1, 3, 4, 5]);
  });
  it('retorna vazio se não for lista', () => {
    expect(normalizarDias(null)).toEqual([]);
    expect(normalizarDias('1,2')).toEqual([]);
  });
});

describe('formatarDias', () => {
  it('segunda a sexta', () => expect(formatarDias([1, 2, 3, 4, 5])).toBe('Seg–Sex'));
  it('terça a sábado', () => expect(formatarDias([2, 3, 4, 5, 6])).toBe('Ter–Sáb'));
  it('dias soltos', () => expect(formatarDias([1, 3, 5])).toBe('Seg, Qua, Sex'));
  it('dois dias seguidos não viram faixa', () => expect(formatarDias([1, 2])).toBe('Seg, Ter'));
  it('faixa mais dia solto', () => expect(formatarDias([0, 2, 3, 4])).toBe('Dom, Ter–Qui'));
  it('vazio', () => expect(formatarDias([])).toBe('—'));
});

describe('rotuloEscala', () => {
  it('sem escala', () => expect(rotuloEscala(null, null)).toBe('Não definida'));
  it('com escala', () =>
    expect(rotuloEscala('Segunda a Sexta', [1, 2, 3, 4, 5])).toBe('Segunda a Sexta (Seg–Sex)'));
});
