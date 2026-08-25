import * as XLSX from 'xlsx';

export interface LinhaQuadroVagas {
  regional: string;
  bandeira: string;
  filialCodigo: string;
  funcao: string;
  secao: string | null;
  emAberto: number;
  limite: number;
  potencial: number;
  alocados: number;
  afastados: number;
}

function asString(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
}

function asOptionalString(v: unknown): string | null {
  const s = asString(v);
  return s === '' ? null : s;
}

function asInt(v: unknown): number {
  if (v == null || v === '') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

export function parseQuadroVagas(buf: Buffer | ArrayBuffer): LinhaQuadroVagas[] {
  const wb = XLSX.read(buf, { type: 'buffer', codepage: 1252, cellDates: false });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error('Planilha sem abas');
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error('Aba vazia');
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });

  return rows
    .map((r) => {
      const upper = new Map(Object.entries(r).map(([k, v]) => [k.toUpperCase().trim(), v]));
      return {
        regional: asString(upper.get('REGIONAL')),
        bandeira: asString(upper.get('BANDEIRA')),
        filialCodigo: asString(upper.get('FILIAL')),
        funcao: asString(upper.get('NOME_FUNCAO')),
        secao: asOptionalString(upper.get('DESC_SECAO')),
        emAberto: asInt(upper.get('EM ABERTO')),
        limite: asInt(upper.get('LIMITE')),
        potencial: asInt(upper.get('POTENCIAL')),
        alocados: asInt(upper.get('ALOCADOS')),
        afastados: asInt(upper.get('AFASTADOS')),
      };
    })
    .filter((r) => r.filialCodigo !== '' && r.funcao !== '');
}
