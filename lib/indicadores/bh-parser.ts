import * as XLSX from 'xlsx';
import { BH_HEADER, BHRowSchema, type BHParseResult, type BHRow } from './bh-validators';

export function parseHHMM(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) {
    if (v < 0) return 0;
    if (v < 1) return v * 24;
    return v;
  }
  if (typeof v !== 'string') return null;
  const m = v.trim().match(/^(\d+):(\d{1,2})$/);
  if (!m) return null;
  const h = Number(m[1]); const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || min >= 60) return null;
  return h + min / 60;
}

function normalizeChapa(v: unknown): string {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return String(Math.trunc(v)).padStart(8, '0');
  }
  return String(v ?? '').trim();
}

export function normalizeCodfilial(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
}

export function parseBHWorkbook(wb: XLSX.WorkBook): BHParseResult {
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error('Planilha vazia');
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });
  if (rows.length === 0) throw new Error('Planilha sem linhas');

  const header = (rows[0] as unknown[]).map((c) => String(c ?? '').trim().toUpperCase());
  for (let i = 0; i < BH_HEADER.length; i++) {
    if (header[i] !== BH_HEADER[i]) {
      throw new Error(`Header inválido: esperado ${BH_HEADER.join(', ')} | recebido ${header.join(', ')}`);
    }
  }

  const out: BHRow[] = [];
  const warnings: BHParseResult['warnings'] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] as unknown[];
    const chapa = normalizeChapa(r[3]);
    const nome  = String(r[4] ?? '').trim();
    if (!chapa || !nome) continue;

    const horas = parseHHMM(r[7]);
    if (horas == null) {
      warnings.push({ linha: i + 1, motivo: `TOTAL_EM_HORA inválido (${String(r[7])})` });
      continue;
    }

    const valor = typeof r[9] === 'number' ? r[9] : Number(r[9] ?? 0);
    const row: BHRow = {
      regional:  r[0] == null ? null : String(r[0]),
      bandeira:  r[1] == null ? null : String(r[1]),
      codfilial: normalizeCodfilial(r[2]),
      chapa,
      nome,
      funcao:    r[5] == null ? null : String(r[5]),
      secao:     r[6] == null ? null : String(r[6]),
      horasDecimal: horas,
      valorPgto: Number.isFinite(valor) ? valor : 0,
      situacao:  r[10] == null ? null : String(r[10]),
    };
    const parsed = BHRowSchema.safeParse(row);
    if (!parsed.success) {
      warnings.push({ linha: i + 1, motivo: parsed.error.issues[0]?.message ?? 'inválido' });
      continue;
    }
    out.push(parsed.data);
  }

  return { rows: out, warnings };
}
