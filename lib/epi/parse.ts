import * as XLSX from 'xlsx';
import type { EpiLinhaInput, StatusEpi } from './tipos';

const ABA = 'Base de dados';

const norm = (s: unknown) =>
  String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();

const txt = (v: unknown): string | null => {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
};

const int = (v: unknown): number | null => {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
};

/** Data do Excel (Date, serial ou texto) → 'yyyy-mm-dd'. Datas fora de 2000..2035 são lixo de digitação e viram null. */
export function paraIso(v: unknown): string | null {
  let d: Date | null = null;
  if (v instanceof Date) d = v;
  else if (typeof v === 'number' && Number.isFinite(v)) d = new Date(Date.UTC(1899, 11, 30) + Math.trunc(v) * 86400000);
  else if (typeof v === 'string') {
    const s = v.trim();
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) d = new Date(Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!));
    else if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/))) {
      const y = +m[3]! < 100 ? 2000 + +m[3]! : +m[3]!;
      d = new Date(Date.UTC(y, +m[1]! - 1, +m[2]!)); // padrão do export: m/d/aa
    }
  }
  if (!d || Number.isNaN(d.getTime())) return null;
  // Excel/xlsx entrega Date em UTC-meia-noite deslocada por fuso; arredonda para o dia mais próximo.
  const dia = new Date(d.getTime() + 12 * 3600 * 1000);
  const y = dia.getUTCFullYear();
  if (y < 2000 || y > 2035) return null;
  return `${y}-${String(dia.getUTCMonth() + 1).padStart(2, '0')}-${String(dia.getUTCDate()).padStart(2, '0')}`;
}

function statusDe(dur: unknown, dataEmp: string | null, dias: number | null): StatusEpi {
  const s = norm(dur);
  if (s === 'REGULAR') return 'REGULAR';
  if (s === 'TROCAR EPI') return 'TROCAR';
  if (s === 'SEM EMPRESTIMO') return 'SEM_EMPRESTIMO';
  if (!dataEmp) return 'SEM_EMPRESTIMO';
  return dias != null && dias < 0 ? 'TROCAR' : 'REGULAR';
}

/** Lê a aba "Base de dados" do painel de EPI e devolve só as linhas da bandeira PERLOG. */
export function parseBaseEpi(wb: XLSX.WorkBook): { linhas: EpiLinhaInput[]; totalBase: number } {
  const aba = wb.SheetNames.find((n) => norm(n) === norm(ABA));
  if (!aba) throw new Error(`Aba "${ABA}" não encontrada no arquivo`);
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[aba]!, { defval: null, raw: true });
  if (rows.length === 0) throw new Error('Aba vazia');

  // Cabeçalho tolerante (acento/caixa): mapeia nome normalizado → chave real.
  const chaves = new Map<string, string>();
  for (const k of Object.keys(rows[0]!)) chaves.set(norm(k), k);
  const col = (nome: string) => chaves.get(norm(nome));
  for (const obrig of ['BANDEIRA', 'FILIAL', 'CHAPA', 'NOME', 'EPI']) {
    if (!col(obrig)) throw new Error(`Coluna ${obrig} não encontrada na aba "${ABA}"`);
  }
  const g = (r: Record<string, unknown>, nome: string) => {
    const k = col(nome);
    return k ? r[k] : null;
  };

  const linhas: EpiLinhaInput[] = [];
  for (const r of rows) {
    if (norm(g(r, 'BANDEIRA')) !== 'PERLOG') continue;
    const filial = txt(g(r, 'FILIAL'));
    const chapa = txt(g(r, 'CHAPA'));
    const nome = txt(g(r, 'NOME'));
    const epi = txt(g(r, 'EPI'));
    if (!filial || !chapa || !nome || !epi) continue;
    const dataEmp = paraIso(g(r, 'DATAEMPRESTIMO'));
    const dias = dataEmp ? int(g(r, 'DIASAVENCER')) : null;
    linhas.push({
      filialCodigo: filial,
      regional: txt(g(r, 'REGIONAL')),
      bandeira: txt(g(r, 'BANDEIRA')),
      secao: txt(g(r, 'DESC_SECAO')),
      chapa,
      nome,
      funcao: txt(g(r, 'FUNCAO')),
      dataAdmissao: paraIso(g(r, 'DATAADMISSAO')),
      codsituacao: txt(g(r, 'CODSITUACAO')),
      itemRisco: txt(g(r, 'NOMEITEMRISCO')),
      codEpi: txt(g(r, 'CODEPI')),
      epi,
      durabilidade: int(g(r, 'DURABILIDADE')),
      diasAVencer: dias,
      dataEmprestimo: dataEmp,
      status: statusDe(g(r, 'STATUSDURABILIDADE'), dataEmp, dias),
      tst: txt(g(r, 'RESPONSÁVEL TECNICO')),
    });
  }
  return { linhas, totalBase: rows.length };
}
