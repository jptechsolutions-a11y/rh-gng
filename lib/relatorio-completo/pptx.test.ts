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
  vagasDetalhe: [],
  statusVagas: [],
};

describe('gerarDeckConsolidado', () => {
  it('produz um pptx de 9 slides', async () => {
    const bytes = await gerarDeckConsolidado(base);
    expect(bytes).toBeInstanceOf(Uint8Array);
    const zip = await JSZip.loadAsync(bytes);
    const slides = Object.keys(zip.files).filter((f) => /ppt\/slides\/slide\d+\.xml$/.test(f));
    expect(slides.length).toBe(9);
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
  });
});
