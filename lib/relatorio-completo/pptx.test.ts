import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { gerarDeckConsolidado } from './pptx';
import type { DadosConsolidado, RankingIndicador } from './tipos';

const rk = (over: Partial<RankingIndicador>): RankingIndicador => ({
  chave: 'inconsist', titulo: 'Inconsistências', temHistorico: false, semDados: false,
  leitura: 'CD A lidera.',
  cds: [
    { filialId: 'a', codigo: '001', nome: 'A', valor: 10, valorFmt: '10', variacao: null, posicao: 1 },
    { filialId: 'b', codigo: '002', nome: 'B', valor: 30, valorFmt: '30', variacao: null, posicao: 2 },
  ],
  ...over,
});

const base: DadosConsolidado = {
  geradoEm: new Date('2026-08-27').toISOString(),
  totalCDs: 2,
  rankings: [
    rk({ chave: 'bh', titulo: 'Banco de Horas', temHistorico: true, cds: [
      { filialId: 'a', codigo: '001', nome: 'A', valor: 100, valorFmt: '100 h', variacao: { deltaPct: -10, tendencia: 'melhorou' }, posicao: 1 },
      { filialId: 'b', codigo: '002', nome: 'B', valor: 400, valorFmt: '400 h', variacao: { deltaPct: 12, tendencia: 'piorou' }, posicao: 2 },
    ] }),
    rk({ chave: 'inconsist', titulo: 'Inconsistências' }),
    rk({ chave: 'cursos', titulo: 'Cursos Obrigatórios', temHistorico: true }),
    rk({ chave: 'feriados', titulo: 'Feriados Pendentes' }),
    rk({ chave: 'vagas', titulo: 'Vagas em Aberto' }),
  ],
  vagasDetalhe: [
    {
      filialId: 'a', codigo: '001', nome: 'A',
      porClassificacao: [
        { classificacao: 'Área de Apoio', aprov: 20, ativo: 18, contratar: 2, abertas: 2, abertasPorStatus: { 'Em aberto': 1, 'Entrevista': 1 } },
        { classificacao: 'Operação', aprov: 70, ativo: 65, contratar: 5, abertas: 5, abertasPorStatus: { 'Em aberto': 4, 'Entrevista': 1 } },
        { classificacao: 'Transporte', aprov: 10, ativo: 9, contratar: 1, abertas: 1, abertasPorStatus: { 'Em aberto': 1 } },
      ],
      totalAprov: 100, totalAtivo: 92, totalContratar: 8, totalAbertas: 8,
      porStatus: { 'Em aberto': 6, 'Entrevista': 2 },
    },
    {
      filialId: 'b', codigo: '002', nome: 'B',
      porClassificacao: [
        { classificacao: 'Operação', aprov: 40, ativo: 39, contratar: 1, abertas: 1, abertasPorStatus: { 'Em aberto': 1 } },
      ],
      totalAprov: 40, totalAtivo: 39, totalContratar: 1, totalAbertas: 1,
      porStatus: { 'Em aberto': 1, 'Entrevista': 0 },
    },
  ],
  statusVagas: ['Em aberto', 'Entrevista'],
};

async function contarSlides(bytes: Uint8Array): Promise<number> {
  const zip = await JSZip.loadAsync(bytes);
  return Object.keys(zip.files).filter((f) => /ppt\/slides\/slide\d+\.xml$/.test(f)).length;
}

describe('gerarDeckConsolidado', () => {
  it('produz um pptx de 9 slides', async () => {
    const bytes = await gerarDeckConsolidado(base);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(await contarSlides(bytes)).toBe(9);
  });

  it('não quebra com indicador semDados nem com 1 CD', async () => {
    const d: DadosConsolidado = {
      ...base,
      rankings: base.rankings.map((r, i) =>
        i === 1 ? { ...r, semDados: true, cds: [] } : { ...r, cds: [r.cds[0]!] },
      ),
    };
    const bytes = await gerarDeckConsolidado(d);
    expect(bytes.byteLength).toBeGreaterThan(2000);
    expect(await contarSlides(bytes)).toBe(9);
  });

  it('subconjunto de indicadores sem Vagas: sem páginas de quadro por CD, total de slides reduzido', async () => {
    // Mesma filtragem que a rota faz: tira "vagas" de rankings e zera
    // vagasDetalhe/statusVagas quando o indicador não foi selecionado.
    const d: DadosConsolidado = {
      ...base,
      rankings: base.rankings.filter((r) => r.chave !== 'vagas'),
      vagasDetalhe: [],
      statusVagas: [],
    };
    const bytes = await gerarDeckConsolidado(d);
    // capa + visão + 4 rankings (bh/inconsist/cursos/feriados) + pódio + encerramento = 8
    expect(await contarSlides(bytes)).toBe(8);
  });

  it('só Vagas selecionado: sem slides de ranking-tabela, mantém o quadro por CD', async () => {
    const d: DadosConsolidado = {
      ...base,
      rankings: base.rankings.filter((r) => r.chave === 'vagas'),
    };
    const bytes = await gerarDeckConsolidado(d);
    // capa + visão + 0 rankings-tabela + 1 slide de vagas (2 CDs cabem num só) + pódio + encerramento = 5
    expect(await contarSlides(bytes)).toBe(5);
  });

  it('só 1 indicador (bh) selecionado: 1 slide de ranking, sem quadro de vagas', async () => {
    const d: DadosConsolidado = {
      ...base,
      rankings: base.rankings.filter((r) => r.chave === 'bh'),
      vagasDetalhe: [],
      statusVagas: [],
    };
    const bytes = await gerarDeckConsolidado(d);
    // capa + visão + 1 ranking + pódio + encerramento = 5
    expect(await contarSlides(bytes)).toBe(5);
  });
});
