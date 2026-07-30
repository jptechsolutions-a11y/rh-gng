import * as XLSX from 'xlsx';

export interface LinhaPassageiro {
  chapa: string;
  nome: string;
  cidade: string | null;
}

const CHAPA_KEYS = ['CHAPA', 'MATRICULA', 'MATRÍCULA'];
const NOME_KEYS = ['NOME', 'COLABORADOR', 'NOME DO COLABORADOR', 'NOME COLABORADOR'];
const CIDADE_KEYS = ['CIDADE', 'MUNICIPIO', 'MUNICÍPIO'];

function asString(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
}

function pick(rowUpper: Map<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    const v = rowUpper.get(k);
    if (v != null && v !== '') return v;
  }
  return null;
}

export function parseListaPassageiros(buf: Buffer | ArrayBuffer): LinhaPassageiro[] {
  const wb = XLSX.read(buf, { type: 'buffer', codepage: 1252, cellDates: false });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error('Planilha sem abas');
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error('Aba vazia');
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });

  return rows
    .map((r) => {
      const upper = new Map(Object.entries(r).map(([k, v]) => [k.toUpperCase().trim(), v]));
      const cidade = pick(upper, CIDADE_KEYS);
      return {
        chapa: asString(pick(upper, CHAPA_KEYS)),
        nome: asString(pick(upper, NOME_KEYS)),
        cidade: cidade ? asString(cidade) : null,
      };
    })
    .filter((r) => r.chapa !== '' && r.nome !== '');
}
