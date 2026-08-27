import { describe, it, expect } from 'vitest';
import { leituraRanking } from './texto';
import type { CDIndicador } from './tipos';

const cd = (over: Partial<CDIndicador>): CDIndicador => ({
  filialId: 'x', codigo: '001', nome: 'CD X', valor: 0, valorFmt: '0',
  variacao: null, posicao: 1, ...over,
});

describe('leituraRanking', () => {
  it('cita líder, lanterna e amplitude', () => {
    const cds = [
      cd({ nome: 'JOINVILLE', valor: 100, valorFmt: '100 h', posicao: 1 }),
      cd({ nome: 'CURITIBA', valor: 400, valorFmt: '400 h', posicao: 2 }),
    ];
    const t = leituraRanking('bh', cds);
    expect(t).toContain('JOINVILLE');
    expect(t).toContain('CURITIBA');
    expect(t).toMatch(/4[.,]0×/);
  });

  it('para indicador com histórico cita maior evolução e maior piora', () => {
    const cds = [
      cd({ nome: 'A', valor: 10, valorFmt: '10', posicao: 1, variacao: { deltaPct: -30, tendencia: 'melhorou' } }),
      cd({ nome: 'B', valor: 50, valorFmt: '50', posicao: 2, variacao: { deltaPct: 25, tendencia: 'piorou' } }),
    ];
    const t = leituraRanking('cursos', cds);
    expect(t).toMatch(/A.*30%/);
    expect(t).toMatch(/B.*25%/);
  });

  it('um único CD não quebra', () => {
    expect(() => leituraRanking('vagas', [cd({ nome: 'SÓ EU', valor: 3, valorFmt: '3', posicao: 1 })])).not.toThrow();
  });

  it('líder zerado usa frase alternativa de amplitude', () => {
    const cds = [
      cd({ nome: 'A', valor: 0, valorFmt: '0', posicao: 1 }),
      cd({ nome: 'B', valor: 5, valorFmt: '5', posicao: 2 }),
    ];
    expect(leituraRanking('feriados', cds)).toMatch(/zerou/i);
  });

  it('lista vazia retorna frase neutra', () => {
    expect(leituraRanking('bh', [])).toMatch(/sem cds/i);
  });
});
