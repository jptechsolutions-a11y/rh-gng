import * as XLSX from 'xlsx';
import { normalizarCodigoFilial } from '@/lib/vagas/normalizar-codigo-filial';
import type { ExpLinhaInput } from './tipos';

const norm = (s: unknown) =>
  String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();

const txt = (v: unknown): string | null => {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
};

/** Date/serial/'dd/mm/aaaa'/'aaaa-mm-dd' → 'yyyy-mm-dd'. */
function dataIso(v: unknown): string | null {
  let d: Date | null = null;
  if (v instanceof Date) d = new Date(v.getTime() + 12 * 3600 * 1000);
  else if (typeof v === 'number' && Number.isFinite(v)) d = new Date(Date.UTC(1899, 11, 30) + Math.trunc(v) * 86400000);
  else if (typeof v === 'string') {
    const br = v.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    const iso = v.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (br) d = new Date(Date.UTC(+br[3]! < 100 ? 2000 + +br[3]! : +br[3]!, +br[2]! - 1, +br[1]!));
    else if (iso) d = new Date(Date.UTC(+iso[1]!, +iso[2]! - 1, +iso[3]!));
  }
  if (!d || Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  if (y < 2000 || y > 2040) return null;
  return `${y}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** Sugere a data da extração pelo nome do arquivo ("AVALIAÇÕES 11.11.xls" → ano atual-11-11). */
export function dataDoNomeArquivo(nome: string, hoje = new Date()): string | null {
  const m = nome.match(/(\d{1,2})[-./](\d{1,2})(?:[-./](\d{2,4}))?/);
  if (!m) return null;
  const dia = +m[1]!, mes = +m[2]!;
  if (dia < 1 || dia > 31 || mes < 1 || mes > 12) return null;
  let ano = hoje.getFullYear();
  if (m[3]) ano = +m[3] < 100 ? 2000 + +m[3] : +m[3];
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

const statusCodigo = (v: unknown): string | null => {
  const s = txt(v);
  if (!s) return null;
  const m = s.match(/^(PFP|PDP|RDP|RFP)\b/i);
  return m ? m[1]!.toUpperCase() : null;
};

/**
 * Lê o arquivo "AVALIAÇÕES": cada colaborador tem uma linha-resumo (sem avaliador, com status
 * PFP/PDP/RDP/RFP nas duas etapas) e linhas individuais de avaliador. Mantém só PERLOG + Ativo.
 * O avaliador "de fallback" é o mais frequente entre as linhas individuais que não são a autoavaliação.
 */
export function parseAvaliacoes(wb: XLSX.WorkBook): { linhas: ExpLinhaInput[]; totalArquivo: number } {
  const aba = wb.SheetNames.find((n) => {
    const ws = wb.Sheets[n];
    if (!ws) return false;
    // Só a 1ª linha (cabeçalho): A1:Z1 evita converter a aba inteira para testar.
    const r = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null, raw: true, range: 'A1:Z1' });
    return (r[0] ?? []).map(norm).includes('CHAPA_AVALIADO');
  });
  if (!aba) throw new Error('Não encontrei uma aba com a coluna CHAPA_AVALIADO (arquivo AVALIAÇÕES)');
  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[aba]!, { header: 1, defval: null, raw: true });
  const idx = new Map<string, number>();
  (rows[0] as unknown[]).forEach((h, i) => { const k = norm(h); if (k && !idx.has(k)) idx.set(k, i); });
  const need = ['BANDEIRA', 'CODFILIAL', 'CHAPA_AVALIADO', 'NOME_AVALIADO', 'STATUS_35DIAS', 'STATUS_70DIAS', 'DTPREVISTA_35DIAS', 'DTPREVISTA_70DIAS'];
  const falta = need.filter((n) => !idx.has(n));
  if (falta.length) throw new Error(`Colunas não encontradas no arquivo: ${falta.join(', ')}`);
  const c = (r: unknown[], n: string) => { const i = idx.get(n); return i == null ? null : r[i]; };

  type Acc = ExpLinhaInput & { avals: Map<string, number>; temResumo: boolean };
  const porChapa = new Map<string, Acc>();
  let total = 0;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] as unknown[];
    if (!r) continue;
    const chapa = txt(c(r, 'CHAPA_AVALIADO'))?.replace(/\.0+$/, '');
    if (!chapa) continue;
    total++;
    if (norm(c(r, 'BANDEIRA')) !== 'PERLOG') continue;
    const sit = norm(c(r, 'DESCSITUACAO_AVALIADO'));
    if (sit && sit !== 'ATIVO') continue;
    const filialRaw = txt(c(r, 'CODFILIAL'))?.replace(/\.0+$/, '');
    if (!filialRaw) continue;
    let a = porChapa.get(chapa);
    if (!a) {
      a = {
        filialCodigo: normalizarCodigoFilial(filialRaw),
        chapa,
        nome: txt(c(r, 'NOME_AVALIADO')) ?? chapa,
        dtAdmissao: dataIso(c(r, 'DATAADMISSAO')),
        avaliadorArquivo: null,
        prev35: null, status35: null, prev70: null, status70: null,
        avals: new Map(), temResumo: false,
      };
      porChapa.set(chapa, a);
    }
    const avaliador = txt(c(r, 'NOME_AVALIADOR'));
    if (avaliador) {
      if (norm(avaliador) !== norm(a.nome)) a.avals.set(avaliador, (a.avals.get(avaliador) ?? 0) + 1);
      continue;
    }
    // Linha-resumo: sem avaliador e com status consolidado nas etapas.
    const s35 = statusCodigo(c(r, 'STATUS_35DIAS'));
    const s70 = statusCodigo(c(r, 'STATUS_70DIAS'));
    if (s35 || s70) {
      a.temResumo = true;
      a.status35 = s35; a.prev35 = dataIso(c(r, 'DTPREVISTA_35DIAS'));
      a.status70 = s70; a.prev70 = dataIso(c(r, 'DTPREVISTA_70DIAS'));
    }
  }

  const linhas: ExpLinhaInput[] = [];
  for (const a of porChapa.values()) {
    if (!a.temResumo) continue;
    const top = Array.from(a.avals.entries()).sort((x, y) => y[1] - x[1])[0]?.[0] ?? null;
    linhas.push({
      filialCodigo: a.filialCodigo, chapa: a.chapa, nome: a.nome, dtAdmissao: a.dtAdmissao,
      avaliadorArquivo: top,
      prev35: a.prev35, status35: a.status35, prev70: a.prev70, status70: a.status70,
    });
  }
  return { linhas, totalArquivo: total };
}
