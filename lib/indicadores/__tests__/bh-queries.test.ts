import { describe, it, expect } from 'vitest';
import {
  agregarResumo, top5Por, agregarResumoPorFilial, montarDetalhado,
  type SnapshotRow,
} from '../bh-queries';

const row = (over: Partial<SnapshotRow> = {}): SnapshotRow => ({
  filialId: 'f1', filialNome: 'Filial 1', filialCodigo: '1',
  chapa: '001', nome: 'Ana', funcao: 'CONFERENTE', secao: 'RECEB',
  horasDecimal: 10, valorPgto: 100, ...over,
});

describe('agregarResumo', () => {
  it('calcula 4 indicadores (média só de >0)', () => {
    const rows = [row({ horasDecimal: 10 }), row({ chapa: '2', horasDecimal: 0 }), row({ chapa: '3', horasDecimal: 5 })];
    const r = agregarResumo(rows);
    expect(r.colaboradores).toBe(3);
    expect(r.totalHoras).toBe(15);
    expect(r.valorTotal).toBe(300);
    expect(r.mediaHoras).toBe(7.5);
  });
  it('mediaHoras = 0 quando ninguém tem saldo', () => {
    const r = agregarResumo([row({ horasDecimal: 0 })]);
    expect(r.mediaHoras).toBe(0);
  });
});

describe('top5Por', () => {
  it('retorna top 5 sem agrupamento de "outros"', () => {
    const rows = [
      row({ funcao: 'A', horasDecimal: 10 }), row({ funcao: 'A', horasDecimal: 5 }),
      row({ funcao: 'B', horasDecimal: 12 }), row({ funcao: 'C', horasDecimal: 8 }),
      row({ funcao: 'D', horasDecimal: 6 }), row({ funcao: 'E', horasDecimal: 4 }),
      row({ funcao: 'F', horasDecimal: 3 }),
    ];
    const top = top5Por(rows, 'funcao');
    expect(top.map(t => t.label)).toEqual(['A','B','C','D','E']);
    expect(top[0]).toEqual({ label: 'A', valor: 15, valorPgto: 200 });
  });
  it('ignora null/empty', () => {
    const rows = [row({ funcao: null, horasDecimal: 5 }), row({ funcao: 'A', horasDecimal: 3 })];
    expect(top5Por(rows, 'funcao')).toEqual([{ label: 'A', valor: 3, valorPgto: 100 }]);
  });
});

describe('agregarResumoPorFilial', () => {
  it('faz join por filialId e calcula variação', () => {
    const atual    = [row({ filialId: 'f1', horasDecimal: 8 }), row({ filialId: 'f2', horasDecimal: 5 })];
    const anterior = [row({ filialId: 'f1', horasDecimal: 10 })];
    const r = agregarResumoPorFilial(atual, anterior);
    const f1 = r.find(x => x.filialId === 'f1')!;
    const f2 = r.find(x => x.filialId === 'f2')!;
    expect(f1.saldoAtual).toBe(8);
    expect(f1.saldoAnterior).toBe(10);
    expect(f1.variacao.tendencia).toBe('melhorou');
    expect(f2.saldoAnterior).toBe(0);
    expect(f2.variacao.tendencia).toBe('piorou');
  });
});

describe('montarDetalhado', () => {
  it('faz join por chapa, marca novo, omite saídas', () => {
    const atual    = [row({ chapa: 'A', horasDecimal: 5 }), row({ chapa: 'B', horasDecimal: 3 })];
    const anterior = [row({ chapa: 'A', horasDecimal: 8 }), row({ chapa: 'C', horasDecimal: 1 })];
    const r = montarDetalhado(atual, anterior);
    expect(r).toHaveLength(2);
    const A = r.find(x => x.chapa === 'A')!;
    const B = r.find(x => x.chapa === 'B')!;
    expect(A.saldoAnterior).toBe(8);
    expect(A.novo).toBe(false);
    expect(B.saldoAnterior).toBeNull();
    expect(B.novo).toBe(true);
  });
});
