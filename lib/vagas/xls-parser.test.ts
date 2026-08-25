import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parseQuadroVagas } from './xls-parser';

function buildXlsx(rows: Record<string, unknown>[]): Buffer {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

const linhaBase = {
  REGIONAL: 'DF',
  BANDEIRA: 'PERLOG',
  FILIAL: '364',
  NOME_FUNCAO: 'AUX. ADMINISTRATIVO',
  DESC_SECAO: 'OPERACIONAL (OPERACAO)',
  'EM ABERTO': 2,
  LIMITE: 4,
  POTENCIAL: 4,
  ALOCADOS: 3,
  AFASTADOS: 1,
};

describe('parseQuadroVagas', () => {
  it('lê os campos de uma linha válida', () => {
    const buf = buildXlsx([linhaBase]);
    const linhas = parseQuadroVagas(buf);
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toEqual({
      regional: 'DF',
      bandeira: 'PERLOG',
      filialCodigo: '364',
      funcao: 'AUX. ADMINISTRATIVO',
      secao: 'OPERACIONAL (OPERACAO)',
      emAberto: 2,
      limite: 4,
      potencial: 4,
      alocados: 3,
      afastados: 1,
    });
  });

  it('secao fica null quando a coluna vem vazia', () => {
    const buf = buildXlsx([{ ...linhaBase, DESC_SECAO: '' }]);
    const linhas = parseQuadroVagas(buf);
    expect(linhas[0]?.secao).toBeNull();
  });

  it('ignora linha sem FILIAL', () => {
    const buf = buildXlsx([{ ...linhaBase, FILIAL: '' }]);
    const linhas = parseQuadroVagas(buf);
    expect(linhas).toHaveLength(0);
  });

  it('ignora linha sem NOME_FUNCAO', () => {
    const buf = buildXlsx([{ ...linhaBase, NOME_FUNCAO: '' }]);
    const linhas = parseQuadroVagas(buf);
    expect(linhas).toHaveLength(0);
  });

  it('EM ABERTO ausente vira 0', () => {
    const { ['EM ABERTO']: _omit, ...semEmAberto } = linhaBase;
    const buf = buildXlsx([semEmAberto]);
    const linhas = parseQuadroVagas(buf);
    expect(linhas[0]?.emAberto).toBe(0);
  });
});
