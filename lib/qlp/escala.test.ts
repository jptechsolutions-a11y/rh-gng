import { describe, it, expect } from 'vitest';
import { formatarDias, normalizarDias, rotuloEscala } from './escala';

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
