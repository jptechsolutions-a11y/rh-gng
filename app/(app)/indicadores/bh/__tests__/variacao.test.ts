import { describe, it, expect } from 'vitest';
import { calcVariacao, formatHoras, formatBRL } from '../variacao';

describe('calcVariacao', () => {
  it('saldo aumentou → piorou (vermelho)', () => {
    expect(calcVariacao(10, 5)).toEqual({ delta: 5, deltaPct: 100, tendencia: 'piorou' });
  });
  it('saldo diminuiu → melhorou (verde)', () => {
    expect(calcVariacao(5, 10)).toEqual({ delta: -5, deltaPct: -50, tendencia: 'melhorou' });
  });
  it('sem mudança → neutro', () => {
    expect(calcVariacao(7, 7)).toEqual({ delta: 0, deltaPct: 0, tendencia: 'neutro' });
  });
  it('anterior zero e atual >0 → piorou, pct null', () => {
    expect(calcVariacao(3, 0)).toEqual({ delta: 3, deltaPct: null, tendencia: 'piorou' });
  });
  it('sem anterior (novo) → piorou e pct null', () => {
    expect(calcVariacao(2, null)).toEqual({ delta: 2, deltaPct: null, tendencia: 'piorou' });
  });
});

describe('formatHoras', () => {
  it('formata com 2 casas e h', () => {
    expect(formatHoras(12.5)).toBe('12,50 h');
    expect(formatHoras(0)).toBe('0,00 h');
  });
});

describe('formatBRL', () => {
  it('formata em real', () => {
    expect(formatBRL(1234.5)).toMatch(/R\$\s?1\.234,50/);
  });
});
