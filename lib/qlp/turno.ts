/**
 * Turno do colaborador, deduzido da hora de ENTRADA na coluna `horario` do QLP.
 *
 * O `horario` vem do XLS como "20508 - 14/17/18/23 - SAB 14/18": código da escala, depois
 * entrada/saída-almoço/volta-almoço/saída. Pode ter texto no meio ("20029 - ESCALA 5X2 - 08/12 - SEG/SEX")
 * e hora com minutos ("1445" = 14:45).
 *
 * Regra (definida pelo RH):
 *   Manhã   — entrada de 04:00 até 11:59
 *   Tarde   — entrada de 12:00 até 17:00
 *   Noturno — entrada depois das 17:00 (inclui madrugada, 00:00–03:59)
 */
export type Turno = 'manha' | 'tarde' | 'noturno';

export const TURNOS: ReadonlyArray<{ valor: Turno; rotulo: string; faixa: string }> = [
  { valor: 'manha', rotulo: 'Manhã', faixa: '04:00–11:59' },
  { valor: 'tarde', rotulo: 'Tarde', faixa: '12:00–17:00' },
  { valor: 'noturno', rotulo: 'Noturno', faixa: 'após 17:00' },
];

export const SEM_TURNO = 'Sem turno';

export function rotuloTurno(t: Turno | null | undefined): string {
  return TURNOS.find((x) => x.valor === t)?.rotulo ?? SEM_TURNO;
}

/** Converte "07", "730" ou "1445" em minutos desde 00:00; nulo se não for um horário válido. */
function minutosDe(digitos: string): number | null {
  let h: number;
  let m: number;
  if (digitos.length <= 2) {
    h = Number(digitos);
    m = 0;
  } else if (digitos.length === 3) {
    h = Number(digitos.slice(0, 1));
    m = Number(digitos.slice(1));
  } else {
    h = Number(digitos.slice(0, 2));
    m = Number(digitos.slice(2));
  }
  if (!Number.isInteger(h) || !Number.isInteger(m) || h > 23 || m > 59) return null;
  return h * 60 + m;
}

/** Hora de entrada (minutos desde 00:00) lida do `horario`; nulo se não der para ler. */
export function minutosEntrada(horario: string | null | undefined): number | null {
  if (!horario) return null;
  // Tira o código inicial ("20508 - ") e procura o primeiro número seguido de "/".
  const semCodigo = horario.replace(/^\s*\d+\s*-\s*/, '');
  const m = /(?<!\d)(\d{1,4})\s*\//.exec(semCodigo);
  const digitos = m?.[1];
  return digitos ? minutosDe(digitos) : null;
}

/** Turno a partir de uma hora de entrada em minutos desde 00:00. */
export function turnoDeMinutos(min: number): Turno {
  if (min >= 4 * 60 && min < 12 * 60) return 'manha';
  if (min >= 12 * 60 && min <= 17 * 60) return 'tarde';
  return 'noturno';
}

/** Turno do colaborador; nulo quando o `horario` está vazio ou fora do padrão. */
export function turnoDoHorario(horario: string | null | undefined): Turno | null {
  const min = minutosEntrada(horario);
  return min === null ? null : turnoDeMinutos(min);
}

/** Valida um valor vindo de URL/formulário ('' e desconhecidos viram nulo; 'sem' = sem turno). */
export function turnoDeParametro(valor: string | null | undefined): Turno | 'sem' | null {
  if (valor === 'sem') return 'sem';
  return TURNOS.find((t) => t.valor === valor)?.valor ?? null;
}
