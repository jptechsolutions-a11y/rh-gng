/** Colaborador encontrado pela matrícula (dados do QLP). */
export interface ColaboradorComite {
  chapa: string;
  nome: string;
  funcao: string;
  secao: string | null;
  filialCodigo: string;
  admissao: string | null; // yyyy-mm-dd
  idade: number | null; // do QLP (pode vir vazio)
  horario: string | null;
}

export interface ComiteLancamento {
  id: string;
  filial: string;
  chapa: string;
  nome: string;
  funcao: string;
  secao: string;
  admissao: string | null;
  idade: number | null;
  horario: string | null;
  turno: Turno;
  suspensoes: number;
  advertencias: number;
  mes: string; // yyyy-mm
  justificativa: string;
  criadoPor: string;
  criadoEm: string; // ISO
  atualizadoEm: string; // ISO
  /** meses de empresa até o fim do mês de referência (null se sem data de admissão) */
  tempoMeses: number | null;
}

export interface ComiteInput {
  filialCodigo: string;
  chapa: string;
  suspensoes: number;
  advertencias: number;
  mes: string; // yyyy-mm
  justificativa: string;
  /** só usada quando o QLP não tem a idade da pessoa */
  idade?: number | null;
}

export interface FilialOpcao {
  codigo: string;
  nome: string;
}

export const TURNOS = ['Manhã', 'Tarde', 'Noite', 'Não informado'] as const;
export type Turno = (typeof TURNOS)[number];

/**
 * Turno pela hora de entrada do horário do QLP ("20508 - 14/17/18/23 - SAB 14/18" → entra às 14h → Tarde).
 * Manhã: 05h–11h59 · Tarde: 12h–17h59 · Noite: 18h–04h59.
 */
export function turnoDoHorario(horario: string | null | undefined): Turno {
  const m = (horario ?? '').match(/-\s*(\d{2})/);
  if (!m) return 'Não informado';
  const h = +m[1]!;
  if (h > 23) return 'Não informado';
  return h >= 5 && h < 12 ? 'Manhã' : h >= 12 && h < 18 ? 'Tarde' : 'Noite';
}

export const FAIXAS_IDADE = ['Até 20 anos', '21 a 25', '26 a 30', '31 a 40', '41 a 50', 'Mais de 50', 'Não informada'] as const;
export function faixaIdade(i: number | null): (typeof FAIXAS_IDADE)[number] {
  if (i == null) return FAIXAS_IDADE[6];
  return i <= 20 ? FAIXAS_IDADE[0] : i <= 25 ? FAIXAS_IDADE[1] : i <= 30 ? FAIXAS_IDADE[2] : i <= 40 ? FAIXAS_IDADE[3] : i <= 50 ? FAIXAS_IDADE[4] : FAIXAS_IDADE[5];
}

/** Mês atual (yyyy-mm) no fuso de Brasília. */
export function mesAtual(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).format(new Date()).slice(0, 7);
}

export const mesValido = (m: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(m);

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const nomeMes = (m: string) => `${MESES[+m.slice(5, 7) - 1]} de ${m.slice(0, 4)}`;

/** Meses completos de empresa entre a admissão e o último dia do mês de referência. */
export function tempoEmpresaMeses(admissao: string | null, mes: string): number | null {
  if (!admissao) return null;
  const a = new Date(admissao + 'T00:00:00Z');
  const fim = new Date(Date.UTC(+mes.slice(0, 4), +mes.slice(5, 7), 0)); // dia 0 do mês seguinte = último dia
  let m = (fim.getUTCFullYear() - a.getUTCFullYear()) * 12 + (fim.getUTCMonth() - a.getUTCMonth());
  if (fim.getUTCDate() < a.getUTCDate()) m--;
  return Math.max(0, m);
}

export function fmtTempo(meses: number | null): string {
  if (meses == null) return '—';
  if (meses < 1) return 'menos de 1 mês';
  const a = Math.floor(meses / 12), m = meses % 12;
  const partes = [];
  if (a) partes.push(`${a} ${a === 1 ? 'ano' : 'anos'}`);
  if (m) partes.push(`${m} ${m === 1 ? 'mês' : 'meses'}`);
  return partes.join(' e ');
}

export const FAIXAS_TEMPO = ['Até 3 meses', '3 a 6 meses', '6 meses a 1 ano', '1 a 2 anos', '2 a 5 anos', 'Mais de 5 anos', 'Sem data de admissão'] as const;
export function faixaTempo(m: number | null): (typeof FAIXAS_TEMPO)[number] {
  if (m == null) return FAIXAS_TEMPO[6];
  return m < 3 ? FAIXAS_TEMPO[0] : m < 6 ? FAIXAS_TEMPO[1] : m < 12 ? FAIXAS_TEMPO[2] : m < 24 ? FAIXAS_TEMPO[3] : m < 60 ? FAIXAS_TEMPO[4] : FAIXAS_TEMPO[5];
}
