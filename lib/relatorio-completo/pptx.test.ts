import { describe, it, expect } from 'vitest';
import { gerarDeckFilial } from './pptx';
import type { DadosFilialRelatorio } from './tipos';

const base: DadosFilialRelatorio = {
  filial: { id: 'f1', codigo: '001', nome: 'Joinville' },
  geradoEm: new Date('2026-08-27').toISOString(),
  resumoExecutivo: [
    { chave: 'bh', titulo: 'Banco de Horas', valorFmt: '340 h', variacao: { deltaPct: 13.3, tendencia: 'piorou' }, posicao: 2, totalFiliais: 9 },
    { chave: 'inconsist', titulo: 'Inconsistências', valorFmt: '20', variacao: null, posicao: 3, totalFiliais: 9 },
    { chave: 'cursos', titulo: 'Cursos Obrigatórios', valorFmt: '15', variacao: { deltaPct: -50, tendencia: 'melhorou' }, posicao: 1, totalFiliais: 9 },
    { chave: 'feriados', titulo: 'Feriados Pendentes', valorFmt: '9', variacao: null, posicao: 4, totalFiliais: 9 },
    { chave: 'vagas', titulo: 'Vagas em Aberto', valorFmt: '7', variacao: null, posicao: 5, totalFiliais: 9 },
  ],
  bh: { resumo: { colaboradores: 12, totalHoras: 340, valorTotal: 0, encargos: 0, valorComEncargos: 0, mediaHoras: 0 }, resumoAnterior: { colaboradores: 10, totalHoras: 300, valorTotal: 0, encargos: 0, valorComEncargos: 0, mediaHoras: 0 }, topSecoes: [{ label: 'LOGISTICA', valor: 200, valorPgto: 0 }], atualizadoEm: '2026-08-25T12:00:00.000Z' },
  inconsist: { resumo: { colaboradores: 8, totalInconsist: 20, mediaPorPessoa: 2.5 }, topTipos: [{ label: 'FALTA MARCACAO', valor: 12, pct: 60 }], atualizadoEm: null },
  cursos: { resumo: { colaboradores: 10, totalPendencias: 15, mediaPorPessoa: 1.5 }, resumoAnterior: { colaboradores: 10, totalPendencias: 30, mediaPorPessoa: 3 }, topTipos: [{ label: 'NR-11', valor: 8, pct: 53 }], atualizadoEm: null },
  feriados: { resumo: { colaboradores: 6, totalPendencias: 9, valorTotal: 1200, mediaPorPessoa: 1.5 }, topSecoes: [{ label: 'EXPEDICAO', valor: 5, pct: 55 }], atualizadoEm: null },
  vagas: { totalAbertas: 7, porStatus: [{ label: 'Em aberto', valor: 7 }], porSecao: [{ label: 'OPERACAO', valor: 4, pct: 57 }] },
};

describe('gerarDeckFilial', () => {
  it('retorna um Uint8Array não-vazio', async () => {
    const out = await gerarDeckFilial(base);
    expect(out).toBeInstanceOf(Uint8Array);
    expect(out.byteLength).toBeGreaterThan(2000);
  });

  it('não quebra quando um indicador está sem dados', async () => {
    const semDados: DadosFilialRelatorio = { ...base, bh: null, vagas: null };
    const out = await gerarDeckFilial(semDados);
    expect(out.byteLength).toBeGreaterThan(2000);
  });
});
