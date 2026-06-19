import * as XLSX from 'xlsx';
import {
  FeriadosRowSchema,
  type FeriadosParseResult, type FeriadosRow,
} from './feriados-validators';
import { parseExcelDate } from './inconsist-parser';

// Normaliza cabeçalhos: tira acentos, pontuação e espaços, deixa em uppercase.
function normHeader(v: unknown): string {
  return String(v ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '')
    .toUpperCase();
}

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

function nullableStr(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

function toNumber(v: unknown): number {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const s = String(v).replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

// Sinônimos por campo lógico — todos normalizados via normHeader.
const FIELD_SYNONYMS: Record<string, string[]> = {
  regional:  ['REGIONAL'],
  bandeira:  ['BANDEIRA'],
  codfilial: ['CODFILIAL', 'FILIAL'],
  chapa:     ['CHAPA'],
  nome:      ['NOME'],
  funcao:    ['DESCFUNCAO', 'FUNCAO'],
  secao:     ['DESCSECAO'],
  codsecao:  ['CODSECAO'],
  pendencia: ['PENDENCIA', 'FERIADO'],
  data:      ['DATA'],
  valor:     ['VALORFERIADO', 'VALOR'],
  dsr:       ['DSR'],
  encargos:  ['ENCARGOS'],
  total:     ['TOTAL'],
};

function indexarColunas(header: unknown[]): Record<string, number> {
  const normHdr = header.map((c) => normHeader(c));
  const map: Record<string, number> = {};
  for (const [campo, syns] of Object.entries(FIELD_SYNONYMS)) {
    for (const syn of syns) {
      const idx = normHdr.indexOf(syn);
      if (idx !== -1) { map[campo] = idx; break; }
    }
  }
  return map;
}

export function parseFeriadosWorkbook(wb: XLSX.WorkBook): FeriadosParseResult {
  if (wb.SheetNames.length === 0) throw new Error('Planilha vazia');

  const out: FeriadosRow[] = [];
  const warnings: FeriadosParseResult['warnings'] = [];
  const abasProcessadas: string[] = [];
  let totalLidoBruto = 0;
  let totalNaoPerlog = 0;

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });
    if (rows.length <= 1) continue;

    abasProcessadas.push(sheetName);
    const header = rows[0] as unknown[];
    const col = indexarColunas(header);

    if (col.bandeira == null || col.chapa == null || col.nome == null || col.codfilial == null) {
      warnings.push({ aba: sheetName, motivo: 'Cabeçalho incompleto (faltam BANDEIRA/CHAPA/NOME/CODFILIAL).' });
      continue;
    }

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i] as unknown[];
      totalLidoBruto += 1;

      const bandeira = String(r[col.bandeira] ?? '').trim();
      if (!/PERLOG/i.test(bandeira)) { totalNaoPerlog += 1; continue; }

      const chapa = normalizeChapa(r[col.chapa]);
      const nome  = String(r[col.nome] ?? '').trim();
      if (!chapa || !nome) continue;

      const row: FeriadosRow = {
        regional:    col.regional  != null ? nullableStr(r[col.regional])  : null,
        bandeira,
        codfilial:   normalizeCodfilial(r[col.codfilial]),
        chapa,
        nome,
        funcao:      col.funcao    != null ? nullableStr(r[col.funcao])    : null,
        secao:       col.secao     != null ? nullableStr(r[col.secao])     : null,
        codsecao:    col.codsecao  != null ? nullableStr(r[col.codsecao])  : null,
        pendencia:   col.pendencia != null ? nullableStr(r[col.pendencia]) : null,
        dataFeriado: col.data      != null ? parseExcelDate(r[col.data])   : null,
        valor:       col.valor    != null ? toNumber(r[col.valor])    : 0,
        dsr:         col.dsr      != null ? toNumber(r[col.dsr])      : 0,
        encargos:    col.encargos != null ? toNumber(r[col.encargos]) : 0,
        total:       col.total    != null ? toNumber(r[col.total])    : 0,
        abaOrigem:   sheetName,
      };

      const parsed = FeriadosRowSchema.safeParse(row);
      if (!parsed.success) {
        warnings.push({ aba: sheetName, linha: i + 1, motivo: parsed.error.issues[0]?.message ?? 'inválido' });
        continue;
      }
      out.push(parsed.data);
    }
  }

  return { rows: out, warnings, abasProcessadas, totalLidoBruto, totalNaoPerlog };
}
