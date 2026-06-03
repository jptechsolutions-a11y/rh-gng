import { describe, it, expect } from 'vitest';
import { calcularPontuacao, classificar, calcularEvolucao } from '../calculos';

describe('calcularPontuacao', () => {
  it('retorna média aritmética das notas', () => {
    expect(calcularPontuacao([5, 5, 5, 5])).toBe(5);
    expect(calcularPontuacao([1, 2, 3, 4, 5])).toBe(3);
    expect(calcularPontuacao([4, 5, 3, 4])).toBe(4);
  });
  it('arredonda para 2 casas decimais', () => {
    expect(calcularPontuacao([1, 2])).toBe(1.5);
    expect(calcularPontuacao([1, 1, 2])).toBe(1.33);
  });
  it('lança erro para array vazio', () => {
    expect(() => calcularPontuacao([])).toThrow();
  });
});

describe('classificar', () => {
  it('EXCELENTE para 4.5–5.0', () => {
    expect(classificar(5.0)).toBe('EXCELENTE');
    expect(classificar(4.5)).toBe('EXCELENTE');
  });
  it('BOM para 3.5–4.49', () => {
    expect(classificar(4.49)).toBe('BOM');
    expect(classificar(3.5)).toBe('BOM');
  });
  it('REGULAR para 2.5–3.49', () => {
    expect(classificar(3.49)).toBe('REGULAR');
    expect(classificar(2.5)).toBe('REGULAR');
  });
  it('PRECISA MELHORAR para < 2.5', () => {
    expect(classificar(2.49)).toBe('PRECISA MELHORAR');
    expect(classificar(1.0)).toBe('PRECISA MELHORAR');
  });
});

describe('calcularEvolucao', () => {
  it('primeira quando sem anterior', () => {
    expect(calcularEvolucao(3.5, null)).toBe('primeira');
  });
  it('positiva quando delta ≥ +0.3', () => {
    expect(calcularEvolucao(4.0, 3.7)).toBe('positiva');
    expect(calcularEvolucao(5.0, 3.0)).toBe('positiva');
  });
  it('negativa quando delta ≤ -0.3', () => {
    expect(calcularEvolucao(3.0, 3.3)).toBe('negativa');
  });
  it('estavel no resto', () => {
    expect(calcularEvolucao(3.5, 3.4)).toBe('estavel');
    expect(calcularEvolucao(3.5, 3.5)).toBe('estavel');
    expect(calcularEvolucao(3.5, 3.7)).toBe('estavel');
  });
});
