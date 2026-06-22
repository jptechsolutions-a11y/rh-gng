import * as XLSX from 'xlsx';

export interface LinhaQuadro {
  regional: string;
  bandeira: string;
  codfilial: number;
  chapa: string;
  nome: string;
  funcao: string;
  secao: string | null;
  horario: string | null;
  nacionalidade: string | null;
  dtAdmissao: string | null;
  mesNasc: number | null;
  idade: number | null;
  situacao: string;
}

function decodeIfMojibake(s: string): string {
  if (!s) return s;
  if (!/�/.test(s) && !/[ÃÂ][-¿]/.test(s)) return s;
  try {
    const bytes = Uint8Array.from(s, (c) => c.charCodeAt(0) & 0xff);
    return new TextDecoder('windows-1252').decode(bytes);
  } catch {
    return s;
  }
}

function formatDate(v: unknown): string | null {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  if (typeof v === 'string') {
    const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    const br = v.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (br) return `${br[3]}-${br[2]}-${br[1]}`;
    return v.slice(0, 10);
  }
  return null;
}

function asString(v: unknown): string {
  if (v == null) return '';
  return decodeIfMojibake(String(v).trim());
}

function asNumberOrNull(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function parseQuadroPerlog(buf: Buffer | ArrayBuffer): LinhaQuadro[] {
  const wb = XLSX.read(buf, { type: 'buffer', codepage: 1252, cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error('XLS sem sheets');
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error('XLS sheet vazio');
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });

  return rows
    .filter((r) => r['CHAPA'] != null && String(r['CHAPA']).trim() !== '')
    .map((r) => ({
      regional: asString(r['REGIONAL']),
      bandeira: asString(r['BANDEIRA']),
      codfilial: Number(r['CODFILIAL']),
      chapa: String(r['CHAPA']).trim(),
      nome: asString(r['NOME']),
      funcao: asString(r['FUNCAO']),
      secao: r['SECAO'] ? asString(r['SECAO']) : null,
      horario: r['HORARIO'] ? asString(r['HORARIO']) : null,
      nacionalidade: r['DESC_NACIONALIDADE'] ? asString(r['DESC_NACIONALIDADE']) : null,
      dtAdmissao: r['DT_ADMISSAO'] ? formatDate(r['DT_ADMISSAO']) : null,
      mesNasc: asNumberOrNull(r['MES_NASCIMENTO']),
      idade: asNumberOrNull(r['IDADE']),
      situacao: asString(r['SITUACAO']),
    }));
}
