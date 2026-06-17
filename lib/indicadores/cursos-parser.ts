import * as XLSX from 'xlsx';
import {
  CURSOS_HEADER, CursosRowSchema,
  type CursosParseResult, type CursosRow,
} from './cursos-validators';
import { parseExcelDate } from './inconsist-parser';

function normalizeChapa(v: unknown): string {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return String(Math.trunc(v)).padStart(8, '0');
  }
  return String(v ?? '').trim();
}

function normalizeCodfilial(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'number' && Number.isFinite(v)) return String(Math.trunc(v));
  return String(v).trim();
}

function toIntOrZero(v: unknown): number {
  if (v == null || v === '') return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function nullableStr(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

export function parseCursosWorkbook(wb: XLSX.WorkBook): CursosParseResult {
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error('Planilha vazia');
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error('Planilha vazia');
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });
  if (rows.length === 0) throw new Error('Planilha sem linhas');

  const header = (rows[0] as unknown[]).map((c) => String(c ?? '').trim().toUpperCase());
  for (let i = 0; i < CURSOS_HEADER.length; i++) {
    if (header[i] !== CURSOS_HEADER[i]) {
      throw new Error(`Header inválido na coluna ${i + 1}: esperado "${CURSOS_HEADER[i]}", recebido "${header[i] ?? ''}"`);
    }
  }

  const out: CursosRow[] = [];
  const warnings: CursosParseResult['warnings'] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] as unknown[];
    // 0=Nome da Origem (ignorado), 1=REGIONAL, 2=BANDEIRA, 3=LOJA, 4=CHAPA, 5=NOME,
    // 6=DESC_FUNCAO, 7=DESC_SECAO, 8=CODSITUACAO, 9=TIPO, 10=DATA, 11=CONTAGEM,
    // 12=PENDENCIA, 13=BP NACIONAL3, 14=BP REGIONAL4
    const chapa = normalizeChapa(r[4]);
    const nome  = String(r[5] ?? '').trim();
    if (!chapa || !nome) continue;

    const row: CursosRow = {
      regional:    nullableStr(r[1]),
      bandeira:    nullableStr(r[2]),
      codfilial:   normalizeCodfilial(r[3]),
      chapa,
      nome,
      funcao:      nullableStr(r[6]),
      secao:       nullableStr(r[7]),
      codsituacao: nullableStr(r[8]),
      tipo:        nullableStr(r[9]),
      dataTreinamento: parseExcelDate(r[10]),
      contagem:    toIntOrZero(r[11]),
      pendencia:   nullableStr(r[12]),
      bpNacional:  nullableStr(r[13]),
      bpRegional:  nullableStr(r[14]),
    };

    const parsed = CursosRowSchema.safeParse(row);
    if (!parsed.success) {
      warnings.push({ linha: i + 1, motivo: parsed.error.issues[0]?.message ?? 'inválido' });
      continue;
    }
    out.push(parsed.data);
  }

  return { rows: out, warnings };
}
