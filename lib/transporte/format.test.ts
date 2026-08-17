import { describe, it, expect } from 'vitest';
import { formatCpf, formatRotaLabel } from './format';

describe('formatCpf', () => {
  it('formata 11 dígitos com máscara 000.000.000-00', () => {
    expect(formatCpf('12345678900')).toBe('123.456.789-00');
  });

  it('remove pontuação existente antes de formatar', () => {
    expect(formatCpf('123.456.789-00')).toBe('123.456.789-00');
  });

  it('retorna os dígitos crus quando não tem 11 dígitos', () => {
    expect(formatCpf('123')).toBe('123');
  });

  it('retorna null para vazio ou nulo', () => {
    expect(formatCpf('')).toBeNull();
    expect(formatCpf(null)).toBeNull();
  });
});

describe('formatRotaLabel', () => {
  it('monta o label com número, nome e turno', () => {
    expect(
      formatRotaLabel({ ordem: 1, nome: 'Tijucas + Canelinha', turno: '1º Turno' }),
    ).toBe('Nº1 - Tijucas + Canelinha (1º Turno)');
  });

  it('usa o número de ordem informado, não um índice fixo', () => {
    expect(
      formatRotaLabel({ ordem: 13, nome: 'Rota 13 Tijucas', turno: '2º Turno' }),
    ).toBe('Nº13 - Rota 13 Tijucas (2º Turno)');
  });
});
