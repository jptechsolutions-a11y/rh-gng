import { describe, it, expect } from 'vitest';
import { textoBH, textoInconsist, textoCursos, textoFeriados, textoVagas } from './texto';

describe('textoBH', () => {
  it('descreve saldo, colaboradores e seção líder com variação de alta', () => {
    const t = textoBH(
      { colaboradores: 12, totalHoras: 340, valorTotal: 0, encargos: 0, valorComEncargos: 0, mediaHoras: 0 },
      { colaboradores: 10, totalHoras: 300, valorTotal: 0, encargos: 0, valorComEncargos: 0, mediaHoras: 0 },
      [{ label: 'LOGISTICA', valor: 200 }],
    );
    expect(t).toContain('340');
    expect(t).toContain('12 colaboradores');
    expect(t).toContain('LOGISTICA');
    expect(t).toMatch(/cresceu 13,3%/i);
  });

  it('variação < 1% vira "estável"', () => {
    const base = { colaboradores: 5, totalHoras: 100, valorTotal: 0, encargos: 0, valorComEncargos: 0, mediaHoras: 0 };
    expect(textoBH(base, base, [])).toMatch(/estável/i);
  });

  it('sem período anterior (zeros) não quebra', () => {
    const zero = { colaboradores: 0, totalHoras: 0, valorTotal: 0, encargos: 0, valorComEncargos: 0, mediaHoras: 0 };
    const atual = { colaboradores: 3, totalHoras: 50, valorTotal: 0, encargos: 0, valorComEncargos: 0, mediaHoras: 0 };
    expect(() => textoBH(atual, zero, [])).not.toThrow();
  });
});

describe('textoInconsist', () => {
  it('cita total, colaboradores e tipo predominante', () => {
    const t = textoInconsist(
      { colaboradores: 8, totalInconsist: 20, mediaPorPessoa: 2.5 },
      [{ label: 'FALTA DE MARCACAO', valor: 12, pct: 60 }],
    );
    expect(t).toContain('20');
    expect(t).toContain('8 colaboradores');
    expect(t).toMatch(/FALTA DE MARCACAO.*60%/);
  });

  it('sem tipos não quebra', () => {
    expect(() => textoInconsist({ colaboradores: 0, totalInconsist: 0, mediaPorPessoa: 0 }, [])).not.toThrow();
  });
});

describe('textoCursos', () => {
  it('cita pendências e variação vs anterior', () => {
    const t = textoCursos(
      { colaboradores: 10, totalPendencias: 15, mediaPorPessoa: 1.5 },
      { colaboradores: 10, totalPendencias: 30, mediaPorPessoa: 3 },
      [{ label: 'NR-11', valor: 8, pct: 53 }],
    );
    expect(t).toContain('15');
    expect(t).toMatch(/caiu 50%/i);
    expect(t).toContain('NR-11');
  });
});

describe('textoFeriados', () => {
  it('cita total e seção líder', () => {
    const t = textoFeriados(
      { colaboradores: 6, totalPendencias: 9, valorTotal: 1200, mediaPorPessoa: 1.5 },
      [{ label: 'EXPEDICAO', valor: 5, pct: 55 }],
    );
    expect(t).toContain('9');
    expect(t).toContain('EXPEDICAO');
  });
});

describe('textoVagas', () => {
  it('cita total de abertas e seção concentradora', () => {
    const t = textoVagas(7, [{ label: 'OPERACAO', valor: 4, pct: 57 }]);
    expect(t).toContain('7');
    expect(t).toContain('OPERACAO');
  });

  it('zero vagas retorna frase neutra', () => {
    expect(textoVagas(0, [])).toMatch(/nenhuma vaga em aberto/i);
  });
});
