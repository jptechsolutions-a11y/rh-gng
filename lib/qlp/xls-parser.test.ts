import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { parseQuadroPerlog } from './xls-parser';

const XLS_PATH = 'C:/Users/juliano.correa/Desktop/ref/QUADRO PERLOG 19_06 (1).xls';
const hasFixture = existsSync(XLS_PATH);

describe.skipIf(!hasFixture)('parseQuadroPerlog - contra XLS Perlog real', () => {
  const buf = hasFixture ? readFileSync(XLS_PATH) : Buffer.alloc(0);

  it('lê 1.739 linhas de colaboradores', () => {
    const linhas = parseQuadroPerlog(buf);
    expect(linhas.length).toBe(1739);
  });

  it('decodifica acentuação latin1 (Férias)', () => {
    const linhas = parseQuadroPerlog(buf);
    const ferias = linhas.find((l) => l.situacao.toLowerCase().includes('rias'));
    expect(ferias).toBeDefined();
    expect(ferias?.situacao).toContain('Férias');
  });

  it('chapa é string (preserva leading zeros se houver)', () => {
    const linhas = parseQuadroPerlog(buf);
    expect(linhas[0]).toBeDefined();
    expect(typeof linhas[0]!.chapa).toBe('string');
  });

  it('codfilial é number', () => {
    const linhas = parseQuadroPerlog(buf);
    expect(linhas[0]).toBeDefined();
    expect(typeof linhas[0]!.codfilial).toBe('number');
  });

  it('dt_admissao no formato ISO YYYY-MM-DD', () => {
    const linhas = parseQuadroPerlog(buf);
    const comData = linhas.find((l) => l.dtAdmissao);
    expect(comData?.dtAdmissao).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('cobre 8 regionais únicas', () => {
    const linhas = parseQuadroPerlog(buf);
    const regionais = new Set(linhas.map((l) => l.regional));
    expect(regionais.size).toBe(8);
  });

  it('cobre 15 codfiliais únicos', () => {
    const linhas = parseQuadroPerlog(buf);
    const cods = new Set(linhas.map((l) => l.codfilial));
    expect(cods.size).toBe(15);
  });
});
