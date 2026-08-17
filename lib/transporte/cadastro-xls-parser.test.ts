import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parseCadastroPassageiros } from './cadastro-xls-parser';

function buildXls(rows: Record<string, unknown>[]): Buffer {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return XLSX.write(wb, { type: 'buffer', bookType: 'biff8' }) as Buffer;
}

describe('parseCadastroPassageiros - CPF', () => {
  it('extrai CPF só com dígitos quando a planilha traz com máscara', () => {
    const buf = buildXls([{ CHAPA: '123', NOME: 'FULANO', CPF: '123.456.789-00' }]);
    const linhas = parseCadastroPassageiros(buf);
    expect(linhas[0]?.cpf).toBe('12345678900');
  });

  it('extrai CPF quando a planilha já traz só dígitos', () => {
    const buf = buildXls([{ CHAPA: '123', NOME: 'FULANO', CPF: '12345678900' }]);
    const linhas = parseCadastroPassageiros(buf);
    expect(linhas[0]?.cpf).toBe('12345678900');
  });

  it('cpf fica null quando a coluna não existe na planilha', () => {
    const buf = buildXls([{ CHAPA: '123', NOME: 'FULANO' }]);
    const linhas = parseCadastroPassageiros(buf);
    expect(linhas[0]?.cpf).toBeNull();
  });

  it('cpf fica null quando a célula está vazia', () => {
    const buf = buildXls([{ CHAPA: '123', NOME: 'FULANO', CPF: '' }]);
    const linhas = parseCadastroPassageiros(buf);
    expect(linhas[0]?.cpf).toBeNull();
  });
});
