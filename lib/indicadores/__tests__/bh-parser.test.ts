import { describe, it, expect } from 'vitest';
import { parseHHMM, normalizeCodfilial, parseBHWorkbook } from '../bh-parser';
import * as XLSX from 'xlsx';
import { BH_HEADER } from '../bh-validators';

function workbookFromRows(rows: unknown[][]) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet');
  return wb;
}

describe('parseHHMM', () => {
  it('converte HH:MM para decimal', () => {
    expect(parseHHMM('12:30')).toBe(12.5);
    expect(parseHHMM('00:00')).toBe(0);
    expect(parseHHMM('41:45')).toBe(41.75);
  });
  it('aceita número (já decimal)', () => {
    expect(parseHHMM(2.5)).toBe(2.5);
  });
  it('retorna null em valor inválido', () => {
    expect(parseHHMM('abc')).toBeNull();
    expect(parseHHMM(null)).toBeNull();
  });
});

describe('normalizeCodfilial', () => {
  it('converte número em string sem padding', () => {
    expect(normalizeCodfilial(20)).toBe('20');
    expect(normalizeCodfilial(364)).toBe('364');
  });
  it('preserva string e tira espaços', () => {
    expect(normalizeCodfilial('  20 ')).toBe('20');
  });
});

describe('parseBHWorkbook', () => {
  const baseRow = [
    'DF', 'PERLOG', 364, '03204142', 'JEFERSON',
    'SUPERVISOR', 'ABASTECIMENTO', '12:19', 0, 590.26, 'ATIVO',
  ];

  it('parseia linhas válidas', () => {
    const wb = workbookFromRows([BH_HEADER as unknown as string[], baseRow]);
    const out = parseBHWorkbook(wb);
    expect(out.rows).toHaveLength(1);
    expect(out.rows[0]).toMatchObject({
      codfilial: '364',
      chapa: '03204142',
      nome: 'JEFERSON',
      horasDecimal: 12 + 19/60,
      valorPgto: 590.26,
    });
    expect(out.warnings).toHaveLength(0);
  });

  it('rejeita header divergente', () => {
    const wb = workbookFromRows([['FOO', 'BAR'], ['x', 'y']]);
    expect(() => parseBHWorkbook(wb)).toThrow(/header/i);
  });

  it('gera warning em linha com HORA inválida e segue', () => {
    const bad = [...baseRow]; bad[7] = 'NAO_HORA';
    const wb = workbookFromRows([BH_HEADER as unknown as string[], bad, baseRow]);
    const out = parseBHWorkbook(wb);
    expect(out.rows).toHaveLength(1);
    expect(out.warnings).toHaveLength(1);
    expect(out.warnings[0].motivo).toMatch(/hora/i);
  });

  it('pula linha de Total Geral (CHAPA vazia)', () => {
    const total = [...baseRow]; total[3] = ''; total[4] = '';
    const wb = workbookFromRows([BH_HEADER as unknown as string[], baseRow, total]);
    const out = parseBHWorkbook(wb);
    expect(out.rows).toHaveLength(1);
    expect(out.warnings).toHaveLength(0);
  });

  it('ignora TOTAL_NEGATIVO (não soma no horasDecimal)', () => {
    const neg = [...baseRow]; neg[7] = '00:00'; neg[8] = -2.85;
    const wb = workbookFromRows([BH_HEADER as unknown as string[], neg]);
    const out = parseBHWorkbook(wb);
    expect(out.rows[0].horasDecimal).toBe(0);
  });
});
