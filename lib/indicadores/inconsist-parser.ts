import * as XLSX from 'xlsx';
import {
  INCONSIST_HEADER, InconsistRowSchema,
  type InconsistParseResult, type InconsistRow,
} from './inconsist-validators';

function normalizeChapa(v: unknown): string {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return String(Math.trunc(v)).padStart(8, '0');
  }
  return String(v ?? '').trim();
}

function normalizeCodfilial(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
}

// Excel serial date → 'YYYY-MM-DD' (UTC). Excel epoch = 1899-12-30.
export function parseExcelDate(v: unknown): string | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number' && Number.isFinite(v)) {
    const ms = Date.UTC(1899, 11, 30) + Math.trunc(v) * 86400000;
    const d = new Date(ms);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }
  if (typeof v === 'string') {
    const s = v.trim();
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return s;
    m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  }
  return null;
}

export function parseInconsistWorkbook(wb: XLSX.WorkBook): InconsistParseResult {
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error('Planilha vazia');
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error('Planilha vazia');
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });
  if (rows.length === 0) throw new Error('Planilha sem linhas');

  const header = (rows[0] as unknown[]).map((c) => String(c ?? '').trim().toUpperCase());
  for (let i = 0; i < INCONSIST_HEADER.length; i++) {
    if (header[i] !== INCONSIST_HEADER[i]) {
      throw new Error(`Header inválido: esperado ${INCONSIST_HEADER.join(', ')} | recebido ${header.join(', ')}`);
    }
  }

  const out: InconsistRow[] = [];
  const warnings: InconsistParseResult['warnings'] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] as unknown[];
    const chapa = normalizeChapa(r[3]);
    const nome  = String(r[4] ?? '').trim();
    const tipo  = String(r[7] ?? '').trim();
    if (!chapa || !nome || !tipo) continue;

    const dataOcorrencia = parseExcelDate(r[8]);

    const row: InconsistRow = {
      regional:  r[0] == null ? null : String(r[0]),
      bandeira:  r[1] == null ? null : String(r[1]),
      codfilial: normalizeCodfilial(r[2]),
      chapa,
      nome,
      funcao:    r[5] == null ? null : String(r[5]),
      secao:     r[6] == null ? null : String(r[6]),
      tipo,
      dataOcorrencia,
      codsituacao: r[9] == null ? null : String(r[9]),
    };

    const parsed = InconsistRowSchema.safeParse(row);
    if (!parsed.success) {
      warnings.push({ linha: i + 1, motivo: parsed.error.issues[0]?.message ?? 'inválido' });
      continue;
    }
    out.push(parsed.data);
  }

  return { rows: out, warnings };
}
