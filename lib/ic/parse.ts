import * as XLSX from 'xlsx';
import { normalizarCodigoFilial } from '@/lib/vagas/normalizar-codigo-filial';
import type { IcHeadcountInput, IcPendenciaInput } from './tipos';

const ABA = 'BASE';

const norm = (s: unknown) =>
  String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();

const txt = (v: unknown): string | null => {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
};

/** 'dd/mm/aaaa' (formato da planilha, texto) ou Date/serial → 'yyyy-mm-dd'. */
function dataIso(v: unknown): string | null {
  let d: Date | null = null;
  if (v instanceof Date) d = new Date(v.getTime() + 12 * 3600 * 1000);
  else if (typeof v === 'number' && Number.isFinite(v)) d = new Date(Date.UTC(1899, 11, 30) + Math.trunc(v) * 86400000);
  else if (typeof v === 'string') {
    const m = v.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m) {
      const y = +m[3]! < 100 ? 2000 + +m[3]! : +m[3]!;
      d = new Date(Date.UTC(y, +m[2]! - 1, +m[1]!));
    }
  }
  if (!d || Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  if (y < 2020 || y > 2035) return null;
  return `${y}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** Sugere a data da semana a partir do nome do arquivo ("IC SEMANAL 27-10.xlsx" → ano atual-10-27). */
export function semanaDoNomeArquivo(nome: string, hoje = new Date()): string | null {
  const m = nome.match(/(\d{1,2})[-./](\d{1,2})(?:[-./](\d{2,4}))?/);
  if (!m) return null;
  const dia = +m[1]!, mes = +m[2]!;
  if (dia < 1 || dia > 31 || mes < 1 || mes > 12) return null;
  let ano = hoje.getFullYear();
  if (m[3]) ano = +m[3] < 100 ? 2000 + +m[3] : +m[3];
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/**
 * Lê a aba BASE do "IC SEMANAL": linhas PERLOG viram pendências; as linhas de
 * cadastro (TIPO "FUNCIONÁRIO", PENDENCIA "CADASTRO DE FUNCIONÁRIOS") não são
 * pendência — só alimentam o total de funcionários por filial.
 */
export function parseBaseIc(wb: XLSX.WorkBook): { pendencias: IcPendenciaInput[]; headcount: IcHeadcountInput[]; totalBase: number } {
  const aba = wb.SheetNames.find((n) => norm(n) === ABA);
  if (!aba) throw new Error(`Aba "${ABA}" não encontrada no arquivo`);
  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[aba]!, { header: 1, defval: null, raw: true });

  // O cabeçalho não está na 1ª linha (há avisos acima): procura a linha com CHAPA + TIPO + PENDENCIA.
  let hdr = -1;
  for (let i = 0; i < Math.min(rows.length, 60); i++) {
    const cols = (rows[i] ?? []).map(norm);
    if (cols.includes('CHAPA') && cols.includes('TIPO') && cols.includes('PENDENCIA') && cols.includes('BANDEIRA')) { hdr = i; break; }
  }
  if (hdr < 0) throw new Error('Cabeçalho (CHAPA, TIPO, PENDENCIA, BANDEIRA) não encontrado na aba BASE');
  const idx = new Map<string, number>();
  (rows[hdr] as unknown[]).forEach((h, i) => { const k = norm(h); if (k && !idx.has(k)) idx.set(k, i); });
  const c = (r: unknown[], nome: string) => { const i = idx.get(nome); return i == null ? null : r[i]; };

  const pendencias: IcPendenciaInput[] = [];
  const funcs = new Map<string, Set<string>>();
  let total = 0;
  for (let i = hdr + 1; i < rows.length; i++) {
    const r = rows[i] as unknown[];
    if (!r) continue;
    const chapa = txt(c(r, 'CHAPA'));
    if (!chapa) continue;
    total++;
    if (norm(c(r, 'BANDEIRA')) !== 'PERLOG') continue;
    const filial = txt(c(r, 'LOJA'));
    if (!filial) continue;
    const fil = normalizarCodigoFilial(filial);
    const categoria = txt(c(r, 'PENDENCIA'));
    if (norm(categoria) === 'CADASTRO DE FUNCIONARIOS' || norm(c(r, 'TIPO')) === 'FUNCIONARIO') {
      const s = funcs.get(fil) ?? new Set<string>();
      s.add(chapa);
      funcs.set(fil, s);
      continue;
    }
    if (!categoria) continue;
    pendencias.push({
      filialCodigo: fil,
      regional: txt(c(r, 'REGIONAL')),
      chapa,
      nome: txt(c(r, 'NOME')) ?? chapa,
      funcao: txt(c(r, 'DESC_FUNCAO')),
      secao: txt(c(r, 'DESC_SECAO')),
      codsituacao: txt(c(r, 'CODSITUACAO')),
      categoria,
      tipo: txt(c(r, 'TIPO')),
      dataPend: dataIso(c(r, 'DATA')),
    });
  }
  const headcount = Array.from(funcs.entries()).map(([filialCodigo, s]) => ({ filialCodigo, qtd: s.size }));
  return { pendencias, headcount, totalBase: total };
}
