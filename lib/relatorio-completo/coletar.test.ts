import { describe, it, expect } from 'vitest';
import { montarRankingIndicador, coletarConsolidado } from './coletar';

describe('montarRankingIndicador', () => {
  const cds = [
    { filialId: 'a', codigo: '001', nome: 'A' },
    { filialId: 'b', codigo: '002', nome: 'B' },
    { filialId: 'c', codigo: '003', nome: 'C' },
  ];

  it('ordena por valor asc e atribui posições', () => {
    const r = montarRankingIndicador({
      chave: 'inconsist', titulo: 'Inconsistências', temHistorico: false,
      metaNula: false, cds,
      valorAtual: new Map([['a', 30], ['b', 10], ['c', 20]]),
      valorAnterior: new Map(),
      fmt: (n) => String(n),
    });
    expect(r.cds.map((c) => c.nome)).toEqual(['B', 'C', 'A']);
    expect(r.cds.map((c) => c.posicao)).toEqual([1, 2, 3]);
    expect(r.cds[0]!.variacao).toBeNull();
    expect(r.semDados).toBe(false);
  });

  it('com histórico calcula deltaPct e tendência', () => {
    const r = montarRankingIndicador({
      chave: 'bh', titulo: 'Banco de Horas', temHistorico: true,
      metaNula: false, cds,
      valorAtual: new Map([['a', 120], ['b', 100], ['c', 90]]),
      valorAnterior: new Map([['a', 100], ['b', 100], ['c', 120]]),
      fmt: (n) => `${n} h`,
    });
    const a = r.cds.find((c) => c.nome === 'A')!;
    expect(a.variacao).toEqual({ deltaPct: 20, tendencia: 'piorou' });
    const c = r.cds.find((c) => c.nome === 'C')!;
    expect(c.variacao!.tendencia).toBe('melhorou');
  });

  it('todos zerados + meta nula ⇒ semDados', () => {
    const r = montarRankingIndicador({
      chave: 'feriados', titulo: 'Feriados', temHistorico: false,
      metaNula: true, cds,
      valorAtual: new Map(), valorAnterior: new Map(),
      fmt: (n) => String(n),
    });
    expect(r.semDados).toBe(true);
    expect(r.cds.every((c) => c.valor === 0)).toBe(true);
  });
});

describe('coletarConsolidado', () => {
  it('inclui vagasDetalhe ordenado por totalAbertas', () => {
    const ctx = {
      bhAtual: [], bhAnterior: [], inconsist: [], cursosAtual: [], cursosAnterior: [], feriados: [],
      vagas: [
        { filialId: 'a', statusNome: 'Em aberto', statusSistema: true, secao: 'SEPARACAO (OPERACAO)' },
        { filialId: 'a', statusNome: 'Entrevista', statusSistema: false, secao: 'COZINHA' },
        { filialId: 'b', statusNome: 'Em aberto', statusSistema: true, secao: 'FINANCEIRO (ADM)' },
      ],
      vagasQuadro: [{ filialId: 'a', secao: 'SEPARACAO (OPERACAO)', limite: 10, alocados: 8 }],
      statusVagas: ['Em aberto', 'Entrevista'],
      classifMapa: new Map([['SEPARACAO (OPERACAO)', 'Operação'], ['COZINHA', 'Área de Apoio'], ['FINANCEIRO (ADM)', 'Área de Apoio']]),
      meta: { bh: null, inconsist: null, cursos: null, feriados: null },
    } as unknown as Parameters<typeof coletarConsolidado>[0];
    const d = coletarConsolidado(ctx, [
      { filialId: 'a', codigo: '001', nome: 'A' },
      { filialId: 'b', codigo: '002', nome: 'B' },
    ]);
    expect(d.vagasDetalhe[0]!.codigo).toBe('001');            // 2 abertas > 1
    expect(d.vagasDetalhe[0]!.totalAbertas).toBe(2);
    expect(d.vagasDetalhe[0]!.contratarPorClassificacao['Operação']).toBe(1);
    expect(d.vagasDetalhe[0]!.contratarPorClassificacao['Área de Apoio']).toBe(1);
    expect(d.vagasDetalhe[0]!.aprov).toBe(10);
    expect(d.vagasDetalhe[0]!.ativo).toBe(8);
    expect(d.statusVagas).toEqual(['Em aberto', 'Entrevista']);
  });
});
