import * as XLSX from 'xlsx';

export interface LinhaCadastro {
  chapa: string;
  nome: string;
  cpf: string | null;
  rua: string | null;
  bairro: string | null;
  cidade: string | null;
  telefone1: string | null;
  telefone2: string | null;
  situacao: string | null;
}

const CHAPA_KEYS = ['CHAPA', 'MATRICULA', 'MATRÍCULA'];
const NOME_KEYS = ['NOME', 'COLABORADOR', 'NOME DO COLABORADOR', 'NOME COLABORADOR'];
const RUA_KEYS = ['RUA', 'ENDERECO', 'ENDEREÇO', 'LOGRADOURO'];
const BAIRRO_KEYS = ['BAIRRO'];
const CIDADE_KEYS = ['CIDADE', 'MUNICIPIO', 'MUNICÍPIO'];
const TEL1_KEYS = ['TELEFONE1', 'TELEFONE 1', 'TELEFONE'];
const TEL2_KEYS = ['TELEFONE2', 'TELEFONE 2'];
const SITUACAO_KEYS = ['SITUACAO', 'SITUAÇÃO', 'STATUS'];
const CPF_KEYS = ['CPF'];

function asString(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
}

function pick(rowUpper: Map<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    const v = rowUpper.get(k);
    if (v != null && v !== '') return v;
  }
  return null;
}

function asOptionalString(rowUpper: Map<string, unknown>, keys: string[]): string | null {
  const v = pick(rowUpper, keys);
  if (!v) return null;
  const s = asString(v);
  if (!s || s.toUpperCase() === 'NULO') return null;
  return s;
}

function asOptionalDigits(rowUpper: Map<string, unknown>, keys: string[]): string | null {
  const v = pick(rowUpper, keys);
  if (v == null) return null;
  const digits = String(v).replace(/\D/g, '');
  return digits || null;
}

export function parseCadastroPassageiros(buf: Buffer | ArrayBuffer): LinhaCadastro[] {
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
        chapa: asString(pick(upper, CHAPA_KEYS)),
        nome: asString(pick(upper, NOME_KEYS)),
        cpf: asOptionalDigits(upper, CPF_KEYS),
        rua: asOptionalString(upper, RUA_KEYS),
        bairro: asOptionalString(upper, BAIRRO_KEYS),
        cidade: asOptionalString(upper, CIDADE_KEYS),
        telefone1: asOptionalString(upper, TEL1_KEYS),
        telefone2: asOptionalString(upper, TEL2_KEYS),
        situacao: asOptionalString(upper, SITUACAO_KEYS),
      };
    })
    .filter((r) => r.chapa !== '' && r.nome !== '');
}
