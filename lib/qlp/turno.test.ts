import { describe, it, expect } from 'vitest';
import {
  minutosEntrada,
  rotuloTurno,
  turnoDeMinutos,
  turnoDeParametro,
  turnoDoHorario,
} from './turno';

describe('minutosEntrada', () => {
  it('lê hora cheia', () => expect(minutosEntrada('20508 - 14/17/18/23 - SAB 14/18')).toBe(14 * 60));
  it('lê hora com minutos (1445 = 14:45)', () => {
    expect(minutosEntrada('20359 - 1445/1830/1930/0033 - ESCALA 5X2 SEG/SEX')).toBe(14 * 60 + 45);
  });
  it('lê entrada com zero à esquerda', () => expect(minutosEntrada('20671 - 05/09/10/14 - SAB 05/09')).toBe(5 * 60));
  it('pula texto antes das horas', () => {
    expect(minutosEntrada('20029 - ESCALA 5X2 - 08/12 - SEG/SEX')).toBe(8 * 60);
  });
  it('aceita horário sem o código', () => expect(minutosEntrada('06/10/11/14')).toBe(6 * 60));
  it('entrada 08:30 escrita como 0830', () => expect(minutosEntrada('20000 - 0830/12/13/17')).toBe(8 * 60 + 30));
  it('nulo para vazio ou sem horas', () => {
    expect(minutosEntrada(null)).toBeNull();
    expect(minutosEntrada('')).toBeNull();
    expect(minutosEntrada('FOLGA')).toBeNull();
  });
  it('nulo para hora impossível', () => expect(minutosEntrada('1 - 25/10/11/14')).toBeNull());
});

describe('turnoDeMinutos — fronteiras', () => {
  const h = (hh: number, mm = 0) => hh * 60 + mm;
  it('03:59 ainda é noturno; 04:00 já é manhã', () => {
    expect(turnoDeMinutos(h(3, 59))).toBe('noturno');
    expect(turnoDeMinutos(h(4))).toBe('manha');
  });
  it('11:59 é manhã; 12:00 é tarde', () => {
    expect(turnoDeMinutos(h(11, 59))).toBe('manha');
    expect(turnoDeMinutos(h(12))).toBe('tarde');
  });
  it('17:00 é tarde; 17:01 é noturno', () => {
    expect(turnoDeMinutos(h(17))).toBe('tarde');
    expect(turnoDeMinutos(h(17, 1))).toBe('noturno');
  });
  it('madrugada e fim da noite são noturno', () => {
    expect(turnoDeMinutos(h(0))).toBe('noturno');
    expect(turnoDeMinutos(h(22))).toBe('noturno');
    expect(turnoDeMinutos(h(23, 59))).toBe('noturno');
  });
});

describe('turnoDoHorario — horários reais do QLP', () => {
  it.each([
    ['20671 - 05/09/10/14 - SAB 05/09', 'manha'],
    ['20015 - 06/11/12/1420 - SEG/SAB', 'manha'],
    ['20319 - 05/10/1112/15 - SEG/SEX', 'manha'],
    ['20028 - 07/12/13/16 - SAB 07/11', 'manha'],
    ['20024 - 08/12/1312/18 - ESCALA 5X2 SEG/SEX', 'manha'],
    ['20508 - 14/17/18/23 - SAB 14/18', 'tarde'],
    ['20375 - 13/17/18/22 - SAB 13/17', 'tarde'],
    ['20705 - 14/18/1912/00 - SEG/SEX', 'tarde'],
    ['20359 - 1445/1830/1930/0033 - ESCALA 5X2 SEG/SEX', 'tarde'],
    ['20754 - 22/01/02/0648 - ESCALA 5X2 SEG/SEX', 'noturno'],
  ])('%s → %s', (horario, esperado) => expect(turnoDoHorario(horario)).toBe(esperado));

  it('nulo quando não dá para ler', () => expect(turnoDoHorario('sem horario')).toBeNull());
});

describe('turnoDeParametro / rotuloTurno', () => {
  it('aceita só valores conhecidos', () => {
    expect(turnoDeParametro('manha')).toBe('manha');
    expect(turnoDeParametro('sem')).toBe('sem');
    expect(turnoDeParametro('x')).toBeNull();
    expect(turnoDeParametro('')).toBeNull();
    expect(turnoDeParametro(undefined)).toBeNull();
  });
  it('rótulos', () => {
    expect(rotuloTurno('noturno')).toBe('Noturno');
    expect(rotuloTurno(null)).toBe('Sem turno');
  });
});
