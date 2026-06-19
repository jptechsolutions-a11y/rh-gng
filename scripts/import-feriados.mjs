// Importação one-shot: "Folgas Feriados Pendentes" → feriados_snapshot.
// Lê todas as abas, mantém apenas BANDEIRA = PERLOG, unifica e insere via SQL.
import XLSX from 'xlsx';
import postgres from 'postgres';
import { readFileSync } from 'node:fs';

const ARQUIVO = 'C:/Users/juliano.correa/Desktop/REF/06-2026 Folgas Feriados Pendentes - 16-06 (1).xls';

const env = Object.fromEntries(
  readFileSync('.env.local','utf8').split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0,i), l.slice(i+1)]; })
);
const DB_URL = env.DIRECT_URL || env.DATABASE_URL;
if (!DB_URL) { console.error('DIRECT_URL/DATABASE_URL ausente em .env.local'); process.exit(1); }

function normHeader(v) {
  return String(v ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '')
    .toUpperCase();
}
const FIELD_SYNONYMS = {
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
function indexarColunas(header) {
  const normHdr = header.map(normHeader);
  const map = {};
  for (const [campo, syns] of Object.entries(FIELD_SYNONYMS)) {
    for (const syn of syns) {
      const idx = normHdr.indexOf(syn);
      if (idx !== -1) { map[campo] = idx; break; }
    }
  }
  return map;
}
function normalizeChapa(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return String(Math.trunc(v)).padStart(8, '0');
  return String(v ?? '').trim();
}
function normalizeCodfilial(v) {
  if (v == null) return '';
  if (typeof v === 'number' && Number.isFinite(v)) return String(Math.trunc(v));
  return String(v).trim();
}
function nullableStr(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}
function toNumber(v) {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const s = String(v).replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}
function parseExcelDate(v) {
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

const wb = XLSX.readFile(ARQUIVO);
const all = [];
let totalBruto = 0, totalNaoPerlog = 0;
const abas = [];
for (const sheetName of wb.SheetNames) {
  const ws = wb.Sheets[sheetName];
  if (!ws) continue;
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  if (rows.length <= 1) continue;
  abas.push(sheetName);
  const col = indexarColunas(rows[0]);
  if (col.bandeira == null || col.chapa == null || col.nome == null || col.codfilial == null) {
    console.warn(`[${sheetName}] cabeçalho incompleto — pulando`);
    continue;
  }
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    totalBruto += 1;
    const bandeira = String(r[col.bandeira] ?? '').trim();
    if (!/PERLOG/i.test(bandeira)) { totalNaoPerlog += 1; continue; }
    const chapa = normalizeChapa(r[col.chapa]);
    const nome  = String(r[col.nome] ?? '').trim();
    if (!chapa || !nome) continue;
    all.push({
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
    });
  }
}

console.log(`Abas: ${abas.join(', ')}`);
console.log(`Brutas: ${totalBruto} | Não-PERLOG: ${totalNaoPerlog} | Aproveitadas: ${all.length}`);

const sql = postgres(DB_URL, { ssl: 'require', prepare: false });
try {
  const codigos = [...new Set(all.map((r) => r.codfilial))];
  const filiais = await sql`SELECT id, codigo FROM filiais WHERE codigo IN ${sql(codigos)}`;
  const mapFilial = new Map(filiais.map((f) => [f.codigo, f.id]));
  let semFilial = 0;

  const inserts = all.map((r) => {
    const fid = mapFilial.get(r.codfilial) ?? null;
    if (!fid) semFilial += 1;
    return {
      filial_id: fid,
      codfilial_origem: r.codfilial,
      chapa: r.chapa,
      nome: r.nome,
      funcao: r.funcao,
      secao: r.secao,
      codsecao: r.codsecao,
      regional: r.regional,
      bandeira: r.bandeira,
      pendencia: r.pendencia,
      data_feriado: r.dataFeriado,
      valor: r.valor.toFixed(2),
      dsr: r.dsr.toFixed(2),
      encargos: r.encargos.toFixed(2),
      total: r.total.toFixed(2),
      aba_origem: r.abaOrigem,
    };
  });
  console.log(`Sem filial cadastrada: ${semFilial}`);

  await sql.begin(async (tx) => {
    await tx`TRUNCATE TABLE feriados_snapshot`;
    if (inserts.length) {
      for (let i = 0; i < inserts.length; i += 500) {
        const batch = inserts.slice(i, i + 500);
        await tx`INSERT INTO feriados_snapshot ${tx(batch)}`;
      }
    }
    const totalFiliais = new Set(inserts.map((i) => i.filial_id).filter(Boolean)).size;
    await tx`
      INSERT INTO feriados_meta (id, ultima_atualizacao, atualizado_por, total_linhas, total_filiais)
      VALUES ('singleton', now(), NULL, ${inserts.length}, ${totalFiliais})
      ON CONFLICT (id) DO UPDATE SET
        ultima_atualizacao = excluded.ultima_atualizacao,
        atualizado_por     = excluded.atualizado_por,
        total_linhas       = excluded.total_linhas,
        total_filiais      = excluded.total_filiais
    `;
  });

  console.log(`OK — ${inserts.length} linhas gravadas em feriados_snapshot.`);
} finally {
  await sql.end();
}
